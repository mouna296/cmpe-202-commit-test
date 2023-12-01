import axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '../components/Navbar';
import NowShowing from '../components/NowShowing';
import TheaterListsByMovie from '../components/TheaterListsByMovie';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { auth } = useContext(AuthContext)
  const [selectedMovieIndex, setSelectedMovieIndex] = useState(parseInt(sessionStorage.getItem('selectedMovieIndex')))
  const [movies, setMovies] = useState([])
  const [isFetchingMoviesDone, setIsFetchingMoviesDone] = useState(false)

  const fetchMovies = async () => {
    try {
      setIsFetchingMoviesDone(false)
      let response;
      if (auth.role === 'admin') {
        response = await axios.get('/movie/unreleased/showing', {
          headers: {
            Authorization: `Bearer ${auth.token}`
          },
        });
      } else {
        response = await axios.get('/movie/showing')
      }
      setMovies(response.data.data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsFetchingMoviesDone(true)
    }
  };

  const fetchWatchedMoviesLast30Days = async (data) => {
	try {
	  const response = await axios.get(`/user/watchedLast30Days/${data.id}, data, `, {
		headers: {
		  Authorization: `Bearer ${auth.token}`
		}
	  })
	  console.log(response.data.data) // Handle the response as needed
	} catch (error) {
	  console.error(error)
	}
  };

  useEffect(() => {
    fetchMovies();
  }, [])

  const props = {
    movies,
    selectedMovieIndex,
    setSelectedMovieIndex,
    auth,
    isFetchingMoviesDone
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-indigo-900 to-blue-500 pb-8 sm:gap-8">
      <Navbar />
      <NowShowing {...props} />
      {movies[selectedMovieIndex]?.name && <TheaterListsByMovie {...props} />}

      {/* Add a button to fetch movies watched in the last 30 days */}
	  <button onClick={() => fetchWatchedMoviesLast30Days(auth.user_id)} className="bg-green-500 text-white p-2 rounded-md mt-4">
        Fetch Watched Movies Last 30 Days
		
      </button>
    </div>
  );
};

export default Home
