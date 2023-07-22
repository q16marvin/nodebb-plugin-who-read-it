'use strict';

/* globals $, define */

define('admin/plugins/who-read-it', ['settings', 'alerts'], function (settings, alerts) {
	const whoreadit = {};

	whoreadit.init = function () {
		const settingsForm = $('.who-read-it-settings');
		settings.load('who-read-it', settingsForm);
		// ugly workaround
		$('option[value="guests"], option[value="spiders"]').hide();

		$('#save').on('click', function () {
			settings.save('who-read-it', settingsForm, function () {
				alerts.success('Settings saved!');
			});
		});
	};

	return whoreadit;
});
