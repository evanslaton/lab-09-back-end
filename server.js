`use strict`;

//Application dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');

//loads environment variables from .env
require('dotenv').config();

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

app.get('/location', searchToLatLong);
app.get('/weather', getWeather);
app.get('/yelp', getYelp);
app.get('/movies', getMovie);
app.get('/meetups', getMeetUps);
app.get('/trails', getTrails);

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

//Helper Functions
// Gets location
function searchToLatLong(request, response) {
  Location.checkLocation({
    query: request.query.data,

    cacheHit: function(result) {
      response.send(result);
    },

    cacheMiss: function() {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${this.query}&key=${process.env.GOOGLE_API_KEY}`;
      return superagent.get(url)
        .then(result => {
          const location = new Location(this.query, result);
          location.save()
            .then(location => response.send(location));
        })
        .catch(error => handleError(error));
    }
  })
}

// Gets weather info
function getWeather(request, response) {
  Weather.lookUp({
    tableName: Weather.tableName,

    location: request.query.data.id,

    cacheHit: function(result) {
      let ageOfResultsInMinutes = (Date.now() - result[0].created_at) / (1000 * 60);
      if (ageOfResultsInMinutes > 60) {
        Weather.deleteByLocationId(Weather.tableName, request.query.data.id);
        this.cacheMiss();
      }
      else {
        response.send(result);
      }
    },

    cacheMiss: function() {
      const url = `https://api.darksky.net/forecast/${process.env.DARK_SKY_API}/${request.query.data.latitude},${request.query.data.longitude}`;
      return superagent.get(url)
        .then((result) => {

          const weatherSummaries = result.body.daily.data.map((day) => {
            const summary = new Weather(day);
            summary.save(request.query.data.id);
            return summary;
          });
          response.send(weatherSummaries);
        })
        .catch(error => handleError(error, response));
    }
  })
}

// Gets Yelp info
function getYelp(request, response) {
  Yelp.lookUp({
    tableName: Yelp.tableName,

    location: request.query.data.id,

    cacheHit: function(result) {
      let ageOfResultsInDays = (Date.now() - result[0].created_at) / (1000 * 60 * 60 * 24);
      if (ageOfResultsInDays > 30) {
        Yelp.deleteByLocationId(Yelp.tableName, request.query.data.id);
        this.cacheMiss();
      }
      else {
        response.send(result);
      }
    },

    cacheMiss: function() {
      const url = `https://api.yelp.com/v3/businesses/search?location=${request.query.data.search_query}`;

      superagent.get(url)
        .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
        .then((result) => {
          const yelpArray = result.body.businesses.map(food => {
            const summary = new Yelp(food);
            summary.save(request.query.data.id);
            return summary;
          })
          response.send(yelpArray);
        })
        .catch(error => handleError(error, response));
    }
  })
}

// Gets movie info
function getMovie(request, response) {
  Movie.lookUp({
    tableName: Movie.tableName,

    location: request.query.data.id,

    cacheHit: function(result) {
      let ageOfResultsInDays = (Date.now() - result[0].created_at) / (1000 * 60 * 60 * 24);
      if (ageOfResultsInDays > 30) {
        Movie.deleteByLocationId(Movie.tableName, request.query.data.id);
        this.cacheMiss();
      }
      else {
        response.send(result);
      }
    },

    cacheMiss: function() {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.THE_MOVIE_DB_API}&query=${request.query.data.search_query}`;

      superagent.get(url)
        .then((result) => {
          const movieSummaries = result.body.results.map(movie => {
            const film = new Movie(movie);
            film.save(request.query.data.id);
            return film;
          });
          response.send(movieSummaries);
        })
        .catch(error => handleError(error, response));
    }
  })
}

// Gets Meet Up info
function getMeetUps(request, response) {
  MeetUp.lookUp({
    tableName:MeetUp.tableName,

    location: request.query.data.id,

    cacheHit: function(result) {
      let ageOfResultsInDays = (Date.now() - result[0].created_at) / (1000 * 60 * 60 * 24);
      if (ageOfResultsInDays > 1) {
        MeetUp.deleteByLocationId(MeetUp.tableName, request.query.data.id);
        this.cacheMiss();
      }
      else {
        response.send(result);
      }
    },

    cacheMiss: function() {
      const url = `https://api.meetup.com/find/upcoming_events?&sign=true&photo-host=public&page=20&key=${process.env.MEETUP_KEY}&lat=${request.query.data.latitude}&lon=${request.query.data.longitude}`;

      superagent.get(url)
        .then((result) => {
          const meetUpSummaries = result.body.events.map((event) => {
            const eventSummary = new MeetUp(event);
            eventSummary.save(request.query.data.id);
            return eventSummary;
          });
          response.send(meetUpSummaries);
        })
        .catch(error => handleError(error, response));
    }
  })
}

// Gets Trail info
function getTrails(request, response) {
  Trail.lookUp({
    tableName:Trail.tableName,

    location: request.query.data.id,

    cacheHit: function(result) {
      let ageOfResultsInDays = (Date.now() - result[0].created_at) / (1000 * 60 * 60 * 24);
      if (ageOfResultsInDays > 1) {
        Trail.deleteByLocationId(Trail.tableName, request.query.data.id);
        this.cacheMiss();
      }
      else {
        response.send(result);
      }
    },

    cacheMiss: function() {

      const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&maxDistance=10&key=${process.env.TRAILS_KEY}`;

      superagent.get(url)
        .then((result) => {
          const allTrailSummaries = result.body.trails.map((trail) => {
            const trailSummary = new Trail(trail);
            trailSummary.save(request.query.data.id);
            return trailSummary;
          });
          response.send(allTrailSummaries);
        })
        .catch(error => handleError(error, response));
    }
  })
}

// Error handler function
function handleError (error, response) {
  console.error(error);
  if(response) return response.status(500).send('Sorry something went terribly wrong.');
}

// Constructors
// Location constructor
function Location(query, result) {
  this.search_query = query;
  this.formatted_query = result.body.results[0].formatted_address;
  this.latitude = result.body.results[0].geometry.location.lat;
  this.longitude = result.body.results[0].geometry.location.lng;
}

Location.tableName = 'locations';

Location.checkLocation = function(location) {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [location.query];

  return client.query(SQL, values)
    .then(result => {
      if(result.rowCount > 0) {
        location.cacheHit(result.rows[0]);
      }
      else {
        location.cacheMiss();
      }
    })
    .catch(console.error);
}

Location.prototype.save = function() {
  const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id;`;
  const values = [this.search_query, this.formatted_query, this.latitude, this.longitude];
  return client.query(SQL, values)
    .then(result => {
      this.id = result.rows[0].id;
      return this;
    });
}

// Weather constructor
function Weather (day) {
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
  this.forecast = day.summary;
  this.created_at = Date.now();
}

Weather.tableName = 'weathers';
Weather.lookUp = lookUp;
Weather.deleteByLocationId = deleteByLocationId;

Weather.prototype.save = function(location_id) {
  const SQL = `INSERT INTO ${Weather.tableName} (forecast, time, created_at, location_id) VALUES ($1, $2, $3, $4);`;
  const values = [this.forecast, this.time, this.created_at, location_id];

  client.query(SQL, values);
}

// Yelp constructor
function Yelp (food) {
  this.name = food.name;
  this.image_url = food.image_url;
  this.price = food.price;
  this.rating = food.rating;
  this.url = food.url;
  this.created_at = Date.now();
}

Yelp.tableName = 'yelps';
Yelp.lookUp = lookUp;
Yelp.deleteByLocationId = deleteByLocationId;

Yelp.prototype.save = function(location_id) {
  const SQL = `INSERT INTO ${Yelp.tableName} (name, image_url, price, rating, url, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
  const values = [this.name, this.image_url, this.price, this.rating, this.url, this.created_at, location_id];

  client.query(SQL, values);
}

// Movie constructor
function Movie (film) {
  this.title = film.title;
  this.overview = film.overview;
  this.average_votes = film.vote_average;
  this.total_votes = film.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${film.poster_path}`;
  this.popularity = film.popularity;
  this.released_on = film.release_date;
  this.created_at = Date.now();
}

Movie.tableName = 'movies';
Movie.lookUp = lookUp;
Movie.deleteByLocationId = deleteByLocationId;

Movie.prototype.save = function(location_id) {
  const SQL = `INSERT INTO ${Movie.tableName} (title, overview, average_vote, total_votes, image_url, popularity, released_on, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
  const values = [this.title, this.overview, this.average_votes, this.total_votes, this.image_url, this.popularity, this.released_on, this.created_at, location_id];

  client.query(SQL, values);
}

// MeetUp constructor
function MeetUp (event) {
  this.link = event.link;
  this.name = event.name;
  this.host = event.group.name;
  this.creation_date = new Date(event.created).toString().slice(0, 15);
  this.created_at = Date.now();
}

MeetUp.tableName = 'meetups';
MeetUp.lookUp = lookUp;
MeetUp.deleteByLocationId = deleteByLocationId;

MeetUp.prototype.save = function(location_id) {
  const SQL = `INSERT INTO ${MeetUp.tableName} (link, name, host, creation_date, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6);`;
  const values = [this.link, this.name, this.host, this.creation_date, this.created_at, location_id];

  client.query(SQL, values);
}

// Trails constructor
function Trail(trail) {
  this.name = trail.name;
  this.trail_url = trail.url;
  this.location = trail.location;
  this.length = trail.length;
  this.condition_date = trail.conditionDate.split(' ')[0];
  this.condition_time = trail.conditionDate.split(' ')[1];
  this.conditions = trail.conditionStatus;
  this.stars = trail.stars;
  this.star_votes = trail.starVotes;
  this.summary = trail.conditionDetails;
  this.created_at = Date.now();
}

Trail.tableName = 'trails';
Trail.lookUp = lookUp;
Trail.deleteByLocationId = deleteByLocationId;

Trail.prototype.save = function(location_id) {
  const SQL = `INSERT INTO ${Trail.tableName} (name, trail_url, location, length, condition_date, condition_time, conditions, stars, star_votes, summary, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;
  const values = [this.name, this.trail_url, this.location, this.length, this.condition_date, this.condition_time, this.conditions, this.stars, this.star_votes, this.summary, this.created_at, location_id];

  client.query(SQL, values);
}


// Generic lookUp function
function lookUp(options) {
  const SQL = `SELECT * FROM ${options.tableName} WHERE location_id=$1;`;
  const values = [options.location];

  client.query(SQL, values)
    .then(result => {
      if(result.rowCount > 0) {
        options.cacheHit(result.rows);
      }
      else {
        options.cacheMiss();
      }
    })
    .catch(console.log('There is an error'));
}

// Generic delete row function
function deleteByLocationId(table, city) {
  const SQL = `DELETE FROM ${table} WHERE location_id=${city};`;
  return client.query(SQL);
}
