(function($){
    $(function(){

        $('.button-collapse').sideNav();
        $('.parallax').parallax();
        $('.tooltipped').tooltip({delay: 50});

        $('.modal-trigger').leanModal();

    }); // end of document ready
})(jQuery); // end of jQuery name space


function getUrlParam(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
}