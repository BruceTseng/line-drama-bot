const request = require('request');
var FeedParser = require('feedparser');
const url = 'http://feeds.feedburner.com/itv-drama';

var fetchDramas = function (result) {
    var req = request(url);
    var feedparser = new FeedParser();
    var videos = [];
    req.on('error', function (error) {
        // handle any request errors
    });

    req.on('response', function (res) {
        var stream = this; // `this` is `req`, which is a stream
        if (res.statusCode !== 200) {
            this.emit('error', new Error('Bad status code'));
        } else {
            stream.pipe(feedparser);
        }
    });

    feedparser.on('error', function (error) {
        // always handle errors
    });

    feedparser.on('readable', function () {
        // This is where the action is!
        var stream = this; // `this` is `feedparser`, which is a stream
        var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
        var item;

        while (item = stream.read()) {
            //console.log(item.title);
            //console.log(item.link);
            // console.log(item);
            var type = '';
            if (item.source.title.indexOf('韓國') !== -1) {
                type = 'korean';
            } else if (item.source.title.indexOf('日本') !== -1) {
                type = 'japan';
            } else if (item.source.title.indexOf('台灣') !== -1) {
                type = 'taiwan';
            }
            videos.push({
                'title': item.title,
                'link': item.link,
                'post_time': Date.parse(item.pubdate),
                'description': item.summary,
                'source': item.source.title,
                type
            });
        }
    });

    feedparser.on('end', function (err) {
        if (err) {
            console.log(err, err.stack);
        }

        if (typeof result == "function") result(videos);
    });

};

var parseDramaList = function (type, dramas) {
    var temps = [];
    dramas.forEach((drama) => {
        if (drama.type === type) {
            temps.push(drama);
        }
    });
    return temps;
}

module.exports = {
    fetchDramas,
    parseDramaList
};