// src/pages/PerfilPage.jsx
import { useParams, useNavigate } from 'react-router-dom';
import Perfil from '../components/Perfil';
import { personasApi} from '../personasApi';

export default function PerfilPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Perfil
      personaId={id}
      personasApi={personasApi}
      onPersonaClick={(p) => p?._id && navigate(`/perfil/${p._id}`)}
    />
  );
}
