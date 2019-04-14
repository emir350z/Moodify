$(document).ready(function () {
  const CLIENT_HOST = 'http://localhost:8000';
  const API_HOST = 'http://localhost:9000';
  const LOGIN_PAGE = `${CLIENT_HOST}/login.html`;
  const udidKey = "moodify-udid";
  const spotifyIdKey = "moodify-spotifyId";

  let udid = localStorage.getItem(udidKey);
  let spotifyId = localStorage.getItem(spotifyIdKey);

  if (udid == null || spotifyId == null) {
    window.location.replace(LOGIN_PAGE);
    return;
  }

  const historicalTrackCount = 15;
  const recentTrackCount = 3;

  const minTempo = 50;
  const maxTempo = 200;
  const tempoStep = 15;

  $.logout = function () {
    localStorage.removeItem(udidKey);
    localStorage.removeItem(spotifyIdKey);
    location.reload();
    return;
  }

  $("#logout").click($.logout);

  let profileEndpoint = `${API_HOST}/profile`;
  let profileParams = {
    udid: udid,
    userId: spotifyId
  };

  // Populate profile data.
  $.get(profileEndpoint, profileParams, function (response) {
    let json = JSON.parse(response);

    let data = json.data;
    let imageSize = 25;

    let image = $('<img>', {
      class: 'profile-image inline',
      src: data.imageUrl,
      width: imageSize,
      height: imageSize
    });

    let name = $('<p>', {
      class: 'profile-name inline',
      text: data.name
    });

    $("#profile-inner").append(image);
    $("#profile-inner").append(name);

  }).fail(function (response) {
    let json = JSON.parse(response.responseText);

    if (json.success == false && json.message.includes('not authorized')) {
      $.logout();
    }
  });

  /**
   * Creates clickable tile for artist/track.
   * 
   * @param data Artist/track data.
   * @param type Data type as 'artist' or 'track'.
   * @param imageSize Requested size for artist/track image.
   * @return Clickable artist/track tile as div object.
   */
  $.createTrackArtistTile = function (data, type, imageSize) {
    let image = $('<img>', {
      class: 'list-item-image',
      src: data.imageUrl,
      width: imageSize,
      height: imageSize
    });

    let imageDiv = $('<div>', {
      class: 'col-sm-3 col-lg-2',
      html: image
    });

    imageDiv.append(image);

    let nameDiv = $('<div>', {
      class: 'col-sm-9 col-lg-10'
    });

    let trackNameDiv = $('<div>', {
      class: 'row list-item-track-name col-sm-12',
      text: data.name
    });

    let artistNames = data.artists.map(artist => artist.name).join(", ");
    let artistNamesDiv = $('<div>', {
      class: 'row list-item-artist-name col-sm-12',
      text: artistNames
    });

    nameDiv.append(trackNameDiv);
    nameDiv.append(artistNamesDiv);

    let listItemDiv = $('<div>', {
      class: 'row list-item'
    });

    listItemDiv.append(imageDiv);
    listItemDiv.append(nameDiv);

    let clickableListItemDiv = $('<a>', {
      target: '_blank',
      rel: 'noopener noreferrer',
      href: `https://open.spotify.com/${type}/${data.id}`
    });

    clickableListItemDiv.append(listItemDiv);

    return clickableListItemDiv;
  }

  /**
   * Populates top artists and tracks.
   * 
   * @param type artist or track
   */
  $.populateTopArtistTracks = function (type, limit) {
    let terms = ["long", "medium", "short"];
    terms.forEach(function (term) {
      let topArtistTrackEndpoint = `${API_HOST}/top-${type}s`;
      let timeRange = `${term}_term`;
      let topArtistTrackParams = {
        udid: udid,
        userId: spotifyId,
        timeRange: timeRange
      };

      $.get(topArtistTrackEndpoint, topArtistTrackParams, function (response) {
        let json = JSON.parse(response);
        let data = json.data.slice(0, limit);
        let divId = `#top-${type}-${term}-term`;
        let imageSize = 45;
        let blockDataDiv = $('<div>', {
          class: 'col-sm-12'
        });

        data.forEach(function (object) {
          let clickableListItemDiv = $.createTrackArtistTile(object, type, imageSize);
          blockDataDiv.append(clickableListItemDiv);
        });

        $(divId).append(blockDataDiv);
      });
    });
  }

  let limit = 5;
  $.populateTopArtistTracks("track", limit);

  /**
   * Search
   */
  $.searchResultArtists = [];
  $.searchResultTracks = [];
  $.seeds = [];
  var jqxhr = { abort: function () { } };
  let searchBox = $("#recommendation-seed-search");
  let searchResultBox = $("#recommendation-search-result-box");

  searchBox.on("input", function () {
    let input = searchBox.val();
    if (input.trim() != "") {
      searchResultBox.show();
      let searchEndpoint = `${API_HOST}/search`;
      let searchParams = {
        udid: udid,
        userId: spotifyId,
        query: input
      };

      jqxhr.abort();
      jqxhr = $.get(searchEndpoint, searchParams, function (response) {
        let json = JSON.parse(response);
        let data = json.data;
        $.searchResultArtists = [];
        $.searchResultTracks = [];

        data.forEach(function (item) {
          if (item.itemType == "artist") {
            $.searchResultArtists.push(item);
          } else if (item.itemType == "track") {
            $.searchResultTracks.push(item);
          }
        });

        $.updateSearchResults($.searchResultArtists, "artist");
        $.updateSearchResults($.searchResultTracks, "track");
      });
    } else {
      $.clearSearch();
    }
  });

  $.clearSearch = function () {
    searchResultBox.hide();
    $.searchResultArtists = [];
    $.searchResultTracks = [];
    $("#recommendation-search-result-artist").empty();
    $("#recommendation-search-result-track").empty();
    searchBox.val("");
  };

  $.updateSearchResults = function (items, itemType) {
    let listId = `#recommendation-search-result-${itemType}`;
    var listData = "";
    let imageSize = 35;

    items.forEach(function (item) {
      let extraData = "";
      if (itemType == "track") {
        extraData = `, ${item.extra}`;
      }
      let imageHtml = `<image src='${item.imageUrl}' class='list-item-image-${itemType}' width='${imageSize}' heigth='${imageSize}'></div>`;

      listData += `<li id='search-result-${item.id}' class='list-item-search-result' data-type='${itemType}'>${imageHtml}${item.name + extraData}</li>`;
    });

    $(listId).html(listData);

    items.forEach(function (item) {
      $(`#search-result-${item.id}`).click(function () {
        let uri = `spotify:${itemType}:${item.id}`;
        if ($.seeds.length == 5) {
          alert("You can specify at most five artists and tracks.");
        } else if (!$.seeds.includes(item)) {
          $.addSeed(item);
        }
        $.clearSearch();
      });
    });
  };

  $.addSeed = function (item) {
    $.seeds.push(item);
    $.populateSeedList();
  };

  $.populateSeedList = function () {
    let htmlList = $.seeds.map(function (item) {
      let divId = `seed-${item.id}`;
      let html = `<div id='${divId}' class='button selected-seed inline' data-hover='Remove'>${item.name}</div>`;
      return html;
    });

    let seedHtml = htmlList.join("");
    $("#recommendation-seed-selected").html(seedHtml);

    $.seeds.forEach(function (item) {
      let divId = `#seed-${item.id}`;
      $(divId).click(function () {
        let index = $.seeds.indexOf(item)
        if (index > -1) {
          $.seeds.splice(index, 1);
          $.populateSeedList();
        }
      });
    });
  }

  // Fill default artists data.
  let defaultArtistsEndpoint = `${API_HOST}/default-artists`;
  let defaultArtistsParams = {
    udid: udid,
    userId: spotifyId
  };

  $.get(defaultArtistsEndpoint, defaultArtistsParams, function (response) {
    let json = JSON.parse(response);
    let data = json.data;
    data.forEach(function (item) {
      $.addSeed(item);
    });
  });

  let recommendationButton = $("#recommendation-create-button");
  recommendationButton.click(
    () => {
      let callback = () => {
        recommendationButton.html("CHECK SPOTIFY");
        setTimeout(
          () => {
            recommendationButton.html("CREATE PLAYLIST");
            alert("Check your Spotify for Discover Moodify playlist!");
          },
          500);
      };

      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag('event', 'create-playlist', {
        'event_category': 'recommendation',
      });

      recommendationButton.html("PLEASE WAIT");
      $.createPlaylist(callback);
    }
  );

  $.getAudioFeatureValue = function (name) {
    return parseFloat($(`#range-${name}`).val());
  };

  $.getAudioFeatureValueForTempo = function () {
    let rawValue = $.getAudioFeatureValue("tempo");
    var value = rawValue * (maxTempo - minTempo) + minTempo;

    if (value < minTempo) {
      value = minTempo;
    } else if (value > maxTempo) {
      value = maxTempo;
    }

    return value;
  }

  $.getSeedIdList = function (type) {
    return $.seeds
      .filter((item) => item.itemType == type)
      .map((item) => item.id);
  };

  $.createPlaylist = function (callback) {
    if ($.seeds.length == 0) {
      alert("You should specify at least one artist or track.");
    } else if ($.seeds.length > 5) {
      alert("You can specify at most five artists and tracks.");
    } else {
      let url = `${API_HOST}/recommendation?udid=${udid}&userId=${spotifyId}`;
      let data = {
        "seedArtistIdList": $.getSeedIdList("artist"),
        "seedTrackIdList": $.getSeedIdList("track"),
        "acousticness": $.getAudioFeatureValue("acousticness"),
        "instrumentalness": $.getAudioFeatureValue("instrumentalness"),
        "tempo": $.getAudioFeatureValueForTempo(),
        "danceability": $.getAudioFeatureValue("danceability"),
        "energy": $.getAudioFeatureValue("energy"),
        "valence": $.getAudioFeatureValue("valence")
      };

      $.postJSON(url, data, callback);
    }
  }

  $.postJSON = function (url, data, callback) {
    return jQuery.ajax({
      'type': 'POST',
      'url': url,
      'data': JSON.stringify(data),
      'success': () => callback(),
      'error': () => console.log('Request failed.')
    });
  };

  /**
   * Chart
   */
  let ctx = $("#stats-chart");

  var chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ["Acousticness", "Instrumentalness", "Tempo", "Danceability", "Energy", "Valence"],
      datasets: [{
        label: 'Last Fifteen Songs',
        borderColor: 'rgba(170, 170, 170, 1)',
        backgroundColor: 'rgba(170, 170, 170, 0.75)',
        borderWidth: 2.5
      },
      {
        label: 'Last Three Songs',
        borderColor: 'rgba(47, 213, 102, 1)',
        backgroundColor: 'rgba(47, 213, 102, 0.75)',
        borderWidth: 2.5
      }]
    },
    options: {
      legend: {
        labels: {
          fontColor: 'rgba(255, 255, 255, 0.9)',
          fontFamily: "'Lato', 'sans-serif'",
          fontSize: 12
        }
      },
      elements: {
        line: {
          fill: false
        },
        point: {
          pointStyle: "star"
        }
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            fontFamily: "'Lato', 'sans-serif'",
            fontColor: 'rgba(255, 255, 255, 0.65)',
            max: 100,
            padding: 20
          },
          gridLines: {
            display: false
          }
        }],
        xAxes: [{
          ticks: {
            beginAtZero: true,
            fontFamily: "'Lato', 'sans-serif'",
            fontColor: 'rgba(255, 255, 255, 0.9)',
            fontSize: 14,
            padding: 20
          },
          gridLines: {
            display: false
          }
        }]
      }
    }
  });

  $.getField = function (json, field) {
    let rawValue = parseFloat(json[field]);
    let value = rawValue * 100;
    let result = value.toFixed(0);

    return result;
  }

  $.getTempo = function (json) {
    let rawValue = parseFloat(json["tempo"]);
    let value = (rawValue - minTempo) / (maxTempo - minTempo) * 100;
    var result = value.toFixed(0);

    if (result < 0) {
      result = 0;
    } else if (result > 100) {
      result = 100;
    }
    return result;
  }

  $.drawChart = function (response, chartIndex) {
    let json = jQuery.parseJSON(response);
    let data = json.data;
    let acousticness = $.getField(data, "acousticness");
    let instrumentalness = $.getField(data, "instrumentalness");
    let tempo = $.getTempo(data);
    let danceability = $.getField(data, "danceability");
    let energy = $.getField(data, "energy");
    let valence = $.getField(data, "valence");

    chart.data.datasets[chartIndex].data = [acousticness, instrumentalness, tempo,
      danceability, energy, valence];
    chart.update();
  }

  let trendlineEndpoint = `${API_HOST}/trendline`;

  let historicTrendlineParams = {
    udid: udid,
    userId: spotifyId,
    numTracks: historicalTrackCount
  };

  let recentTrendlineParams = {
    udid: udid,
    userId: spotifyId,
    numTracks: recentTrackCount
  };

  // Update the historical trendline chart.
  $.get(trendlineEndpoint, historicTrendlineParams, function (response) {
    $.drawChart(response, 0);
  });

  $.updateRangePosition = function (json, field) {
    var value = parseFloat(json[field]).toFixed(1);

    if (field == "tempo") {
      value = (value - minTempo) / (maxTempo - minTempo);
      if (value < 0) {
        value = 0;
      } else if (value > 1) {
        value = 1;
      }
    }

    $(`#range-${field}`).val(value);
  }

  // Update the recent trendline chart.
  $.get(trendlineEndpoint, recentTrendlineParams, function (response) {
    $.drawChart(response, 1);
    let json = jQuery.parseJSON(response);
    let data = json.data;
    $.updateRangePosition(data, "acousticness");
    $.updateRangePosition(data, "instrumentalness");
    $.updateRangePosition(data, "tempo");
    $.updateRangePosition(data, "danceability");
    $.updateRangePosition(data, "energy");
    $.updateRangePosition(data, "valence");
  });

});
