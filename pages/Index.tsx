import { useLocation } from "react-router-dom";
import Rooms from "./Rooms";
import DirectMessages from "./DirectMessages";
import Ranking from "./Ranking";
import Profile from "./Profile";
import Settings from "./Settings";

const Index = () => {
  const location = useLocation();
  
  switch (location.pathname) {
    case '/dm':
      return <DirectMessages />;
    case '/ranking':
      return <Ranking />;
    case '/profile':
      return <Profile />;
    case '/settings':
      return <Settings />;
    case '/rooms':
    case '/':
    default:
      return <Rooms />;
  }
};

export default Index;
