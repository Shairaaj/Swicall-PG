import React from 'react'
import { useAuth0 } from '@auth0/auth0-react'
const LogoutButton = () => {
    const {isAuthenticated, logout} = useAuth0();
  return (
    isAuthenticated && (
        <button onClick={()=> logout()}>
            Signout
        </button>
    )
  )
}

export default LogoutButton