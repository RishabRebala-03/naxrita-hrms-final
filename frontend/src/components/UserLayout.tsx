import { NavLink, Outlet } from "react-router-dom"
import "./UserLayout.css"

interface Props {
  onLogout: () => void
}

const UserLayout: React.FC<Props> = ({ onLogout }) => {
  return (
    <div className="user-layout">
      <aside className="sidebar">
        <div className="sidebar-header">Exam Portal</div>

        <nav className="sidebar-nav">
          <NavLink to="/user/dashboard" className="nav-item">
            Dashboard
          </NavLink>
          <NavLink to="/user/tests" className="nav-item">
            Tests
          </NavLink>
        </nav>

        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout