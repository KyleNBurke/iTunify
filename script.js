$(document).ready(function(){ 
	$('#navTabs a').click(function (e) {
		e.preventDefault()
		$(this).tab('show')
	})

	$("#navTabs button").click(authorize);
	$("#allGenres button").click(updateAllGenres);
	$("#hipHop button").click(updateHipHop);
	$("#rnb button").click(updateRnB);
});

function updateAllGenres()
{
	update("https://itunes.apple.com/us/rss/topsongs/limit=50/explicit=true/xml", "allGenres", "2V07Dnbb1oeOi1DuastrUV");
}

function updateHipHop()
{
	update("https://itunes.apple.com/us/rss/topsongs/limit=50/genre=18/explicit=true/xml", "hipHop", "2Mvn8DwcRwa36CrX0YpVHt");
}

function updateRnB()
{
	update("https://itunes.apple.com/us/rss/topsongs/limit=50/genre=15/explicit=true/xml", "rnb", "2aN17RtUI8TNUF8dQVLhnO");
}

function authorize()
{
	var clientID = "8c1c8a8cfdee4f2b8a53f86de34d5ecd";
	var scopes = "playlist-modify-public playlist-modify-private";
	var redirectURI = "http://casualkyle.github.io/redirect.html";
    //var redirectURI = "http://localhost/itunify/redirect.html";

	var url = "https://accounts.spotify.com/authorize?response_type=token&client_id=" + clientID + "&scope=" + scopes + "&redirect_uri=" + redirectURI;

	window.open(url);
}

function update(url, genre, playlistURI)
{
	 $("#" + genre + " div").text("Updating...");

	 if(localStorage.getItem("accessToken") === null)
	 {
	 	$("#" + genre + " div").text("Access token not found");
	 	return;
	 }

	var xmlHttp = new XMLHttpRequest();

	xmlHttp.onreadystatechange = function()
	{
		if(xmlHttp.readyState == 4 && xmlHttp.status == 200)
		{
			responseSuccessful(xmlHttp.responseXML, genre, playlistURI);
		}
	};

	xmlHttp.open("GET", url, true);
	xmlHttp.send();
}

function responseSuccessful(doc, genre, playlistURI)
{
    $("#"+genre+" table").html("");
    clearPlaylsit(localStorage.getItem("accessToken"), playlistURI);

	var entryNodes = doc.getElementsByTagName("entry");
    var tracks = "";
    var queries = [];

    for(var i = 0; i < entryNodes.length; i++)
    {
        var n = entryNodes[i];

        var currentField = n.childNodes[7].textContent;
        var trackTitle;
        var featured = null;

        if(currentField.split(" (feat. ").length > 1)
        {
            trackTitle = currentField.split(" (feat. ")[0];
            featured = currentField.split(" (feat. ")[1].split(")")[0];
        }
        else if(currentField.split(" [feat. ").length > 1)
        {
            trackTitle = currentField.split(" [feat. ")[0];
            featured = currentField.split(" [feat. ")[1].split("]")[0];
        }
        else
            trackTitle = currentField;

        currentField = n.childNodes[17].textContent;
        var artistName = currentField;

        if(featured != null)
        {
            if(featured.split(" & ").length > 1)
                artistName += ", " + featured.split(" & ")[0] + ", " + featured.split(" & ")[1];
            else
                artistName += ", " + featured;
        }

        var artwork = n.childNodes[21].textContent;
        var title = n.childNodes[7].textContent;
        var artist = n.childNodes[17].textContent;
        var album = n.childNodes[31].textContent;

        $("#"+genre+" table").append('<tr><td>' + (i + 1) +'</td><td><image src="' + artwork + '" width="32px" height="32px" /></td><td>' + title + "</td><td>" + artist + "</td><td>" + album + "</td></tr>");

        var query = "track:" + encodeURI(trackTitle + " ") + "artist:" + encodeURI(artistName);

        var forbiddenChar = false;
        if(query.split("#").length > 1) //forbidden character
        {
            query = query.split("#")[0] + query.split("#")[1];
            forbiddenChar = true;
        }

        $.ajax({
            url: "https://api.spotify.com/v1/search?q=" + query + "&type=track",
            type: "GET",
            dataType: "json",
            async: false,
            success: function(data)
            {
                if(forbiddenChar)
                    $("#" + genre + " table tbody").children().eq(i).addClass("warning");

                if(data.tracks.items.length == 0)
                {
                    $("#" + genre + " table tbody").children().eq(i).addClass("danger");
                    return;
                }

                var uri = data.tracks.items[0].uri;

                if(data.tracks.items.length > 1 && !data.tracks.items[0].explicit && data.tracks.items[1].explicit)
                {
                    var name1 = data.tracks.items[0].name;
                    var artist1 = data.tracks.items[0].artists;
                    var name2 = data.tracks.items[0].name;
                    var artist2 = data.tracks.items[0].artists;

                    if(name1 == name2 && artist1 == artist2)
                        uri = data.tracks.items[1].uri;
                }

                tracks += uri + ",";
            }
        });
    }

    tracks = tracks.slice(0, -1);

    $.ajax({
        url: "https://api.spotify.com/v1/users/casualkyle/playlists/" + playlistURI +"/tracks?uris=" + tracks,
        type: "POST",
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("accessToken"),
            "Content-Type": "application/json"
        }
    });

    $("#" + genre + " div").text("Done!");
}

function clearPlaylsit(accessToken, playlistURI)
{
    $.ajax({
        url: "https://api.spotify.com/v1/users/casualkyle/playlists/" + playlistURI,
        headers: {
            "Authorization": "Bearer " + accessToken
        },
        dataType: "json",
        success: function(data)
        {
            if(data.tracks.items.length == 0)
                return;

            var positions = "";

            for(var i = 0; i < data.tracks.items.length; i++)
                positions += i.toString() + ", ";

            positions = positions.slice(0, -2);

            $.ajax({
                type: "DELETE",
                url: "https://api.spotify.com/v1/users/casualkyle/playlists/" + playlistURI + "/tracks",
                headers: {
                    "Authorization": "Bearer " + accessToken,
                    "Content-Type": "application/json"
                },
                data: "{\"positions\": ["+positions+"], \"snapshot_id\": \""+data.snapshot_id+"\"}"
            });
        }
    });
}