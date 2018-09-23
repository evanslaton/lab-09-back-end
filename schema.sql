CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(8, 6),
  longitude NUMERIC(9, 6)
);

CREATE TABLE IF NOT EXISTS weathers (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500),
  overview VARCHAR(500),
  average_vote INTEGER,
  total_votes INTEGER,
  image_url VARCHAR(255),
  popularity NUMERIC(4, 3),
  released_on VARCHAR(10),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS yelps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  image_url VARCHAR(255),
  price VARCHAR(5),
  rating NUMERIC(4,1),
  url VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS meetups (
id SERIAL PRIMARY KEY,
link VARCHAR(255),
name VARCHAR(255),
host VARCHAR(255),
creation_date BIGINT,
created_at BIGINT,
location_id INTEGER NOT NULL REFERENCES locations(id)
);