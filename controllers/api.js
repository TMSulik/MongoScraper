const express = require("express");
const router = express.Router();
const db = require("../models");
const request = require("request"); // Makes http calls
const cheerio = require("cheerio");
 
// A GET route for scraping the NYT website
router.get("/scrape", (req, res) => {
    request("https://www.nytimes.com/", (error, response, body) => {
        if (!error && response.statusCode === 200) {
            // Load into cheerio and save it to $ for a shorthand selector
            const $ = cheerio.load(body);
            let count = 0;
            // Grab every article:
            $('article a').each(function (i, element) {
                // Save an empty result object
                let count = i;
                let result = {};

                // Add the text, href, and summary of each article, saving them to the result object
                result.title = $(element)
                    .children('div')
                    .text();
                result.link = "https://www.nytimes.com"+$(element)
                    .attr("href");
                result.summary = $(element)
                    .children('li')
                    .text().trim()
                    || $(element)
                        .children('ul')
                        .text().trim();
                if (result.title && result.link && result.summary){
                    // Create a new Article using the `result` object built from scraping, but only if all three values are present
                    db.Article.create(result)
                        .then(function (dbArticle) {
                            count++;
                        })
                        .catch(function (err) {
                            return res.json(err);
                        });
                };
            });
            // If articles are successfully scraped and saved, redirect to the index
            res.redirect('/');
        }
        else if (error || response.statusCode != 200){
            res.send("Error: Unable to obtain new articles")
        }
    });
});

router.get("/", (req, res) => {
    db.Article.find({})
        .then(function (dbArticle) {
            const retrievedArticles = dbArticle;
            let hbsObject;
            hbsObject = {
                articles: dbArticle
            };
            res.render("index", hbsObject);        
        })
        .catch(function (err) {
            res.json(err);
        });
});

router.get("/saved", (req, res) => {
    db.Article.find({isSaved: true})
        .then(function (retrievedArticles) {
            let hbsObject;
            hbsObject = {
                articles: retrievedArticles
            };
            res.render("saved", hbsObject);
        })
        .catch(function (err) {
            res.json(err);
        });
});

// Route for getting all Articles from the db
router.get("/articles", function (req, res) {
    db.Article.find({})
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

// Route for marking an article as saved
router.put("/save/:id", function (req, res) {
    db.Article.findOneAndUpdate({ _id: req.params.id }, { isSaved: true })
        .then(function (data) {
            res.json(data);
        })
        .catch(function (err) {
            res.json(err);
        });
});

router.put("/remove/:id", function (req, res) {
    db.Article.findOneAndUpdate({ _id: req.params.id }, { isSaved: false }, { isDiscarded: true })
        .then(function (data) {
            res.json(data);
        })
        .catch(function (err) {
            res.json(err);
        });
});

// Route for grabbing a specific Article by id & populating it with it's note
router.get("/articles/:id", function (req, res) {
    db.Article.find({ _id: req.params.id })
        .populate({
            path: 'note',
            model: 'Note'
        })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
router.post("/note/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            return db.Article.findOneAndUpdate({ _id: req.params.id }, {$push: { note: dbNote._id }}, { new: true });
        })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

router.delete("/note/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.findByIdAndRemove({ _id: req.params.id })
        .then(function (dbNote) {
            return db.Article.findOneAndUpdate({ note: req.params.id }, { $pullAll: [{ note: req.params.id }]});
        })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

// Route for removing an article from search results
router.put("/discard/:id", function (req, res) {
    db.Article.findOneAndUpdate({ _id: req.params.id }, { isDiscarded: true })
        .then(function (data) {
            res.json(data);
        })
        .catch(function (err) {
            res.json(err);
        });;
});

module.exports = router;