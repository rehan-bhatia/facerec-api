const express = require('express');
const app=express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai= require('clarifai');


//creating database on psql
const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'rehanbhatia',
    password : '',
    database : 'udemyapp'
  }
});

// parsing json input
app.use(bodyParser.json());

// access control for attaching to frontend
app.use(cors());


// root directory for testing
app.get('/', (req, res) => {
	res.send(database.users)
});

// sigin response 
app.post('/signin', (req,res) =>{
	db.select('email', 'hash').from('login')
		.where('email','=', req.body.email)
		.then(data => {
			const Check = bcrypt.compareSync(req.body.password, data[0].hash);
			if (Check) {
				db.select('*').from('users')
					.where('email', '=', req.body.email)
					.then(user => res.json(user[0]))
					.catch(err => res.status(404).json('user not found'))
			} else {
				res.status(400).json('wrong details')
			}
		})
		.catch(err=>res.status(404).json('user not found'))
})

// register response
app.post('/register', (req,res) => {
	const {name, email, password } = req.body;
	if (!email || !name || !password) {
		return res.status(400).json("Please enter details")
	}
	const hash=bcrypt.hashSync(password);
	db.transaction(trx => {
		trx.insert({
			email: email,
			hash: hash
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
			.returning('*')
			.insert({
				name: name,
				email: loginEmail[0],
				joined: new Date()
			})
			.then(user=>res.json(user[0]))
			.catch(err=>res.status(400).json('unable to register'))
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	
	
})

// to get user details for homepage
app.get('/profile/:id', (req,res)=>{
	const { id } = req.params;
	db.select('*').from('users').where({
		id: id
	})
	.then(user=> {
		if (user.length) {
			res.json(user);	
		} else {
			res.status(404).json('user not found');
		}
		
	})
	.catch(err=>res.status(400).json('error'))
})

// updating count for rank
app.put('/image', (req, res) => {
	const {id} = req.body;
	db('users')
	.where('id', '=', id)
	.increment("entries", 1)
	.returning("entries")
	.then(entries => res.json(entries[0]))
	.catch(err => res.status(400).json('error'))
})

//for API Call
const capp = new Clarifai.App({
 apiKey: '21fbae258481480e8d591f4c0321add4'
});

app.post('/imageurl', (req,res)=> {
	capp.models
      .predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
      .then(data => res.json(data))
      .catch(err=>res.status(400).json('could not make API call'))
})

app.listen(3000, ()=> {
	console.log('app is running')
});