'use strict';

const LRU = require('lru-cache');
const winston = require.main.require('winston');

const cache = LRU({
	max: 500,
	length: function () { return 1; },
	maxAge: 5000,
});

const groups = require.main.require('./src/groups');
const meta = require.main.require('./src/meta');
const user = require.main.require('./src/user');
const privileges = require.main.require('./src/privileges');
const socketPlugins = require.main.require('./src/socket.io/plugins');
const routeHelpers = require.main.require('./src/routes/helpers');
const socketIO = require.main.require('./src/socket.io');
const widgets = require.main.require('./src/widgets');
const db = require.main.require('./src/database');
const moment = require('moment');  

const plugin = module.exports;

plugin.init = async function (hookData) {
	routeHelpers.setupAdminPageRoute(hookData.router, '/admin/plugins/who-read-it', renderAdmin);
};

plugin.addAdminNavigation = async function (menu) {
	menu.plugins.push({
		route: '/plugins/who-read-it',
		icon: 'fa-group',
		name: 'who read it',
	});
	return menu;
};

plugin.filterTopicBuild = async function (hookData) {
	// whoreadit users are rendered via websockets,
	// this is just here so theme can check for plugin and import partial, see persona topic.tpl
	hookData.templateData.whoreadit = true;
	return hookData;
};

async function renderAdmin(req, res) {
	const groupsData = await groups.getNonPrivilegeGroups('groups:createtime', 0, -1);
	groupsData.sort((a, b) => b.system - a.system);
	res.render('admin/plugins/who-read-it', { groups: groupsData });
}

socketPlugins.whoreadit = {};
socketPlugins.whoreadit.getwhoreadit = async function (socket, data) {
	const canRead = await privileges.topics.can('read', data.tid, socket.uid);
	if (!canRead) {
		throw new Error('[[error:no-privileges]]');
	}

	const settings = await getSettings();
	const isVisible = await widgets.checkVisibility(settings, socket.uid);
	if (!isVisible) {
		return [];
	}

	return await getUsersReadTopic(socket.uid, data.tid);
};

async function getSettings() {
	const _settings = await meta.settings.get('who-read-it');
	const settings = {
		groups: [],
		groupsHideFrom: [],
	};

	try {
		settings.groups = _settings.groups ? JSON.parse(_settings.groups) : [];
		settings.groupsHideFrom = _settings.groupsHideFrom ? JSON.parse(_settings.groupsHideFrom) : [];
	} catch (e) {
		winston.warn('[who-read-it/getSettings] Groups settings are invalid.');
	}

	return { ..._settings, ...settings };
}

function isUserInCache(whoreadit, uid) {
	if (parseInt(uid, 10) <= 0) {
		return true;
	}
	return whoreadit.find(user => parseInt(user.uid, 10) === parseInt(uid, 10));
}

	
async function getUsersReadTopic(uid, tid) {
	const whoreadit = cache.peek('whoreadit:tid:' + tid) || [];
	//console.log('whoreadit',whoreadit);
	

	if (whoreadit.length && isUserInCache(whoreadit, uid)) {
		whoreadit.forEach(function (user) {
			//user.composing = composingUsers.includes(user.uid);
		});

		return whoreadit;
	}

	try {
		const socketids = Array.from(await socketIO.server.in('topic_' + tid).allSockets());
		const roomData = await Promise.all(socketids.map(sid => socketIO.server.of('/').adapter.socketRooms(sid)));
		const uids = {};
		
		const dbUsers = await db.getSortedSetRevRange('users:joindate', 0, 100000000);
		//console.log('dbUsers',dbUsers);
		for(const user of dbUsers){
			//console.log('user',user);
			const dbtidsread = await db.getSortedSetRevRangeWithScores('uid:'+user + ':tids_read', 0, 100000000);
			
			dbtidsread.forEach(function (t_id) {
				if(tid==t_id.value) {
					//console.log('t_id',user,t_id);
					uids[user] = t_id.score;
					
				}
			})
		}
		
		
		
		/*dbUsers.forEach(function (user) {
			const dbtidsread = await db.getSortedSetRevRangeWithScores('uid:'+user + ':tids_read', 0, 100000000);
			//console.log('dbtidsread',dbtidsread);
			dbtidsread.forEach(function (t_id) {
				if(tid==t_id.value) {
					uids[user] = t_id.score;
				}
			})
		})*/
		
		
		
		
		
		/*db.getSortedSetRevRange('users:joindate', 0, 100000000, function (err, users) {
			
			if (err) return console.log(err)
				users.forEach(function (user) {
					
					// Do a thing here.
				  //console.log(user)
				 // db.getSortedSetRevRange('uid:'+user + ':tids_read', 0, 100000000, function (err,tids) {
					  //console.log('tids:',tids)
				  //}) 
				  db.getSortedSetRevRangeWithScores('uid:'+user + ':tids_read', 0, 100000000, function (err,tids) {
					
					 // console.log(JSON.parse(tids[0]))
					tids.forEach(function (t_id) {
						
						if(tid==t_id.value) {
							//console.log(tid,t_id.value,t_id.score,tid==t_id.value,user)
							//uids[user] = t_id.score;
							console.log(user,tid,t_id.value,t_id.score,tid==t_id.value)
							//uids[user] = true;
							//uids[1] = true;
							//console.log('uids_in',uids);
							
						}
					})
				  })
				})
			
		})*/
		
		
		
		/*roomData.forEach(function (clientRooms) {
			if (clientRooms && clientRooms.forEach) {
				clientRooms.forEach(function (roomName) {
					if (roomName.startsWith('uid_')) {
						uids[roomName.split('_')[1]] = true;
					}
				});
			}
		});
		*/
		if (uid) {
			uids[uid] = new Date().getTime();
		}
		const settings = await meta.settings.get('who-read-it');
		settings.numUsers = Math.min(100, settings.numUsers || 10);

		let userIds = Object.keys(uids).map(x => parseInt(x, 10));
		//console.log('userIds',userIds,'uids',uids);

		// bump composing users to the front of the queue
		//const intersection = userIds.filter(x => composingUsers.includes(x));
		//const remainder = userIds.filter(x => !composingUsers.includes(x));
		//userIds = intersection.concat(remainder).slice(0, 100);

		let userData = await user.getUsersFields(userIds, ['uid', 'username', 'userslug', 'picture', 'status']);
		//userData = userData.filter(user => user && parseInt(user.uid, 10) > 0 && user.status !== 'offline').slice(0, settings.numUsers);
		//userData = await user.blocks.filter(uid, userData);

		userData.forEach(function (user) {
			//user.composing = composingUsers.includes(user.uid);
			//user.readtimestamp = new Date(uids[user.uid]).toLocaleString('de-DE');
			user.readtimestamp = moment(uids[user.uid]).format('DD.MM.YYYY HH:mm:ss');
		});
		
		userData.sort((a, b) => (a.username > b.username) ? 1 : -1);
		
		cache.set('whoreadit:tid:' + tid, userData);
		//console.log('whoreadit:tid:' + tid, userData);
		return userData;
	} catch (err) {
		if (err.message === 'timeout reached while waiting for clients response') {
			return null;
		}
		throw err;
	}
}
