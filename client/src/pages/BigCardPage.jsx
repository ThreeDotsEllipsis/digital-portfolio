import { useEffect, useState } from 'react';
import Header from '../components/header/header';
import BigCard from '../components/big-card/big-card'
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

function BigCardPage({ port, id }) {

  const params = useParams();
  const idPortfolio = params.idPortfolio;
  const idAchieve = params.idAchieve;
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login')
    }
    handleGetData();
  }, []);


  const [achieve, setAchieve] = useState([]);

  const handleGetData = async () => {
    const { data } = await axios.get(`http://localhost:4000/api/portfolios/${idPortfolio}`)
    data.achievements.forEach(element => {
      if (element._id === idAchieve) {
        setAchieve(element)
      }
    });
  }

  return (
    <main class="container">
      <Header />
      <BigCard data={achieve} />
    </main>
  );
}

export default BigCardPage;
