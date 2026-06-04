import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Practice from './pages/Practice'
import Exam from './pages/Exam'
import WrongBook from './pages/WrongBook'
import Favorites from './pages/Favorites'
import Uncertain from './pages/Uncertain'
import Custom from './pages/Custom'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/exam" element={<Exam />} />
      <Route path="/wrong" element={<WrongBook />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/uncertain" element={<Uncertain />} />
      <Route path="/custom" element={<Custom />} />
    </Routes>
  )
}
