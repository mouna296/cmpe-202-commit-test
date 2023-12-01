const User = require('../models/User')
const Movie = require('../models/Movie');


//@desc    Register user
//@route   POST /auth/register
//@access  Public
//@desc    Register user
//@route   POST /auth/register
//@access  Public
exports.register = async (req, res, next) => {
	try {
	  const { username, email, password, role = 'user', membership } = req.body;
  
	  // Validate membership value (optional, based on your requirements)
	  const validMemberships = ['Regular', 'Premium'];
	  if (membership && !validMemberships.includes(membership)) {
		return res.status(400).json({ success: false, message: 'Invalid membership type' });
	  }
  
	  // Create user
	  const user = await User.create({
		username,
		email,
		password,  
		role,
		membership,
	  });
  
	  sendTokenResponse(user, 200, res); 
	} catch (err) {
	  console.error(err);
	  res.status(400).json({ success: false, message: err.message });
	}
  };
  

//@desc		Login user
//@route	POST /auth/login
//@access	Public
exports.login = async (req, res, next) => {
	try {
		const { username, password } = req.body

		//Validate email & password
		if (!username || !password) {
			return res.status(400).json('Please provide an username and password')
		}

		//Check for user
		const user = await User.findOne({ username }).select('+password')

		if (!user) {
			return res.status(400).json('Invalid credentials')
		}

		//Check if password matches
		const isMatch = await user.matchPassword(password)

		if (!isMatch) {
			return res.status(401).json('Invalid credentials')
		}

		sendTokenResponse(user, 200, res)
	} catch (err) {
		res.status(400).json({ success: false, message: err })
	}
}

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
	//Create token
	const token = user.getSignedJwtToken()

	const options = {
		expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
		httpOnly: true
	}

	if (process.env.NODE_ENV === 'production') {
		options.secure = true
	}
	res.status(statusCode).cookie('token', token, options).json({
		success: true,
		token
	})
}

//@desc		Get current Logged in user
//@route 	POST /auth/me
//@access	Private
exports.getMe = async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id)
		res.status(200).json({
			success: true,
			data: user
		})
	} catch (err) {
		res.status(400).json({ success: false, message: err })
	}
}

//@desc		Get user's tickets
//@route 	POST /auth/tickets
//@access	Private
exports.getTickets = async (req, res, next) => {
	try {
	  const user = await User.findById(req.user.id, { tickets: 1, rewardPoints: 1 }).populate({
		path: 'tickets.showtime',
		populate: [
		  'movie',
		  { path: 'theater', populate: { path: 'cinema', select: 'name' }, select: 'cinema number' }
		],
		select: 'theater movie showtime isRelease'
	  })
  
	  res.status(200).json({
		success: true,
		data: user
	  })
	  console.log('get ticktes', user)
	} catch (err) {
	  res.status(400).json({ success: false, message: err })
	}
  }

//@desc		Log user out / clear cookie
//@route 	GET /auth/logout
//@access	Private
exports.logout = async (req, res, next) => {
	try {
		res.cookie('token', 'none', {
			expires: new Date(Date.now() + 10 * 1000),
			httpOnly: true
		})

		res.status(200).json({
			success: true
		})
	} catch (err) {
		res.status(400).json({ success: false, message: err })
	}
}

//@desc		Get All user
//@route 	POST /auth/user
//@access	Private Admin
exports.getAll = async (req, res, next) => {
	try {
		const user = await User.find().populate({
			path: 'tickets.showtime',
			populate: [
				'movie',
				{ path: 'theater', populate: { path: 'cinema', select: 'name' }, select: 'cinema number' }
			],
			select: 'theater movie showtime isRelease'
		})

		res.status(200).json({
			success: true,
			data: user
		})
	} catch (err) {
		res.status(400).json({ success: false, message: err })
	}
}

//@desc		Delete user
//@route 	DELETE /auth/user/:id
//@access	Private Admin
exports.deleteUser = async (req, res, next) => {
	try {
		const user = await User.findByIdAndDelete(req.params.id)

		if (!user) {
			return res.status(400).json({ success: false })
		}
		res.status(200).json({ success: true })
	} catch (err) {
		res.status(400).json({ success: false, message: err })
	}
}

//@desc     Update user
//@route    PUT /auth/user/:id
//@access   Private
exports.updateUser = async (req, res, next) => {
	try {
		const user = await User.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true
		})

		if (!user) {
			return res.status(400).json({ success: false, message: `User not found with id of ${req.params.id}` })
		}
		res.status(200).json({ success: true, data: user })
	} catch (err) {
		res.status(400).json({ success: false, message: err })
	}
}


//@desc     GET movies watched in the last 30 days based on tickets
//@route    GET /movies/watchedLast30Days
//@access   Public
exports.getWatchedMoviesLast30Days = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const user = await User.findById(req.params.id, { tickets: 1, rewardPoints: 1 }).populate({
      path: 'tickets.showtime',
      populate: [
        'movie',
        { path: 'theater', populate: { path: 'cinema', select: 'name' }, select: 'cinema number' }
      ],
      select: 'theater movie showtime isRelease'
    });
	console.log('user data', user)

    // Extract movie IDs from the user's tickets
    const movieIds = user.tickets.map(ticket => ticket.showtime.movie._id)

    // Find watched movies based on the movie IDs and the watchedAt field
    const watchedMovies = await Movie.find({
      _id: { $in: movieIds },
      watchedAt: { $gte: thirtyDaysAgo, $lte: new Date() }
    })

    res.status(200).json({
      success: true,
      count: watchedMovies.length,
      data: watchedMovies
    })
	console.log('getWatchedMovies30days',watchedMovies)
  } catch (err) {
    res.status(400).json({ success: false, message: err })
  }
}

