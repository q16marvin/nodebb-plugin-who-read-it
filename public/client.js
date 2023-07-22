'use strict';

/* globals $, window, document, app, ajaxify, socket */

$(document).ready(function () {
	const MAX_INTERVAL = 5000;
	const MIN_INTERVAL = 2500;
	const INTERVAL_STEP = 500;
	const USERS_PER_INTERVAL_INCREASE = 10;

	let interval = MIN_INTERVAL;

	$(window).on('action:ajaxify.end', function () {
		if (ajaxify.data.template.topic && app.user.uid) {
			renderwhoreadit();
		}
	});

	function renderwhoreadit() {
		if (!ajaxify.data.tid || !ajaxify.data.template.topic || !app.isFocused) {
			return;
		}
		require(['alerts'], function (alerts) {
			
			socket.emit('plugins.whoreadit.getwhoreadit', {
				tid: ajaxify.data.tid,
			}, function (err, data) {
				console.log('client_data',ajaxify.data.tid,data);
				if (err) {
					return alerts.error(err.message);
				}
				if (!data || !ajaxify.data.template.topic) {
					return;
				}
				var currentUids = data.map(function (user) { return parseInt(user.uid, 10); });
				var alreadyAddedUids = [];
				var whoreaditEl = $('[component="topic/who-read-it"]');
				
				// remove any users that are no longer in topic
				whoreaditEl.find('[data-uid]').each(function () {
					var uid = parseInt($(this).attr('data-uid'), 10);
					if (!currentUids.includes(uid)) {
						$(this).remove();
					} else {
						alreadyAddedUids.push(uid);
					}
				});

				if (noChanges(currentUids, alreadyAddedUids)) {
					startTimeout(currentUids);
					return;
				}
				
				app.parseAndTranslate('partials/topic/who-read-it', 'whoreadit', {
					whoreadit: data,
				}, function (html) {
					
					var whoreaditEl = $('[component="topic/who-read-it"]');
					var whoreaditElcount = $('[component="topic/who-read-it-count"]');
					
					//
					//whoreaditElcount.replaceWith('<i class="fa fa-check fa-fw" title="Who Read It" component="topic/who-read-it-count">&nbsp;'+ data.length + '</i>');
					whoreaditElcount.html("&nbsp;" + data.length);
										
					if (!whoreaditEl.length) {
						return;
					}

					// add any new users
					html.filter('[data-uid]').each(function () {
						var $this = $(this);
						var uid = parseInt($this.attr('data-uid'), 10);
						if (!alreadyAddedUids.includes(uid) && !whoreaditEl.find('[data-uid=' + uid + ']').length) {
							whoreaditEl.append($this);
							//app.createUserTooltips(whoreaditEl);
						}
					});


					startTimeout(currentUids);
				});
			});
			
		});
	}

	function startTimeout(currentUids) {
		interval = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Math.floor(currentUids.length / USERS_PER_INTERVAL_INCREASE) * INTERVAL_STEP));
		setTimeout(renderwhoreadit, interval);
	}

	function noChanges(currentUids, alreadyDisplayedUids) {
		if (currentUids.length !== alreadyDisplayedUids.length) {
			return false;
		}

		for (var i = 0; i < currentUids.length; i++) {
			if (currentUids[i] !== alreadyDisplayedUids[i]) {
				return false;
			}
		}
		return true;
	}
	
	var whoreaditEl = $('[component="topic/who-read-it"]');
	var whoreaditElcount = $('[component="topic/who-read-it-count"]');
	whoreaditEl.toggle();
	whoreaditElcount.on( "click", function() {
	  console.log(whoreaditEl);
	  whoreaditEl.toggle();
	});
});
