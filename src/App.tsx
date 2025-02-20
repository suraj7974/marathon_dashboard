import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import PaymentVerify from "../components/step1";
import TShirtDistribution from "../components/step2";
import BibDistribution from "../components/step3";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PaymentVerify />} />

        <Route path="/tshirt-distribution" element={<TShirtDistribution />} />
        <Route path="/bib-allocation" element={<BibDistribution/>}/>
      </Routes>
    </Router>
  );
}

export default App;
