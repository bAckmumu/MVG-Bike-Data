var Text = (function(window, d3) {

    var districts = null;
    d3.json('data/district_text.json', function(error, districtsData) {
        districts = districtsData;
    });

    function loadDistrict(id) {
        if (districts === null || districts === undefined ) { return; }

    	var selectedDistrict = districts.find( function(district) {
            return district.id === id;
        });
        $("#textH4").text(selectedDistrict.name);
        $("#textP").text(selectedDistrict.description);
    }

    return {
        loadDistrict: loadDistrict
    };

})(window, d3);