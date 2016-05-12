$(document).ready(function() {
	$('.getinput input[name=tier]').on('input propertychange paste', function() {
		var text = $(this).val().substr(0, 2).toLowerCase();
		var options = document.getElementsByName('weight')[0].options;
		if (text === 'ou' && options[2].value !== '1695') {
			options[2].innerHTML = '1695';
			options[2].value = '1695';
			options[3].innerHTML = '1825';
			options[3].value = '1825';
		} else if (text !== 'ou' && options[2].value !== '1630') {
			options[2].innerHTML = '1630';
			options[2].value = '1630';
			options[3].innerHTML = '1760';
			options[3].value = '1760';
		}
	});
	$('#queryform').submit(function(e) {
		e.preventDefault();
		// Delete the current usage fields
		$('.spreads').find('tr').slice(1).remove();
		$('p#error').remove();
		// Server deals with empty fields just fine, let's just roll with it
		var data = $(this).serialize();
		$.ajax({
			url: '/usage',
			type: 'get',
			data: data,
			success: renderResult
		});
	});
});

function renderResult(resp) {
	if (resp.indexOf('|') < 0) {
		$('.usage').prepend('<p id="error">' + resp + '</p>');
		return;
	}
	var data = resp.split('|');
	var buff = '';
	// Build a html structure from the information
	// The server sends the information sorted, so all we have
	// to do is make html out of it.
	for (var i = 0, len = data.length - 1; i < len; i++) {
		var things = data[i].split(':');
		buff += '<tr' + (i % 2 ? '>' : ' class="odd-row">');
		buff += '<td>' + (i + 1) + '</td>';
		buff += '<td>' + things[0] + '</td>';
		buff += '<td>' + things[1].split('/').join('&nbsp;/&nbsp;') + '</td>';
		buff += '<td>' + things[2] + '</td>';
	}
	$('.spreads').append(buff);
}