import { useState } from "react";

function App() {
  const [contacts, setContacts] = useState([]);

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  const loadContacts = async () => {
    const res = await fetch("http://localhost:5000/api/contacts", {
      credentials: "include",
    });

    const data = await res.json();
    setContacts(data);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Swicall Google People API Test</h1>

      <button onClick={handleGoogleLogin}>Login with Google</button>

      <br />
      <br />

      <button onClick={loadContacts}>Load My Google Contacts</button>

      <h2>Contacts:</h2>
      <pre>{JSON.stringify(contacts, null, 2)}</pre>
    </div>
  );
}

export default App;
