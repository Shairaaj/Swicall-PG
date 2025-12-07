// src/Components/ContactsPage/ContactsPage.jsx
import React, { useContext, useEffect, useState } from "react";
import "./ContactsPage.css";
import { AuthContext } from "../../Contexts/AuthContext";
import axios from "axios";

const ContactsPage = () => {
  const { username, email, token, logout, isPrimaryDevice, deviceId } =
    useContext(AuthContext);

  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const api = import.meta.env.VITE_API_URL;

  // attach token explicitly for all protected API calls
  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    if (!token) return;
    loadContacts();
  }, [token]);

  const loadContacts = async () => {
    if (!token) return;
    setError("");
    try {
      const res = await axios.get(`${api}/api/contacts`, authConfig);
      setContacts(res.data || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        logout();
      } else {
        setError(err.response?.data?.error || "Failed to load contacts");
      }
    }
  };

  const handleCopy = (phone) => {
    navigator.clipboard
      .writeText(phone)
      .then(() => alert("Copied: " + phone))
      .catch(() => alert("Copy failed"));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this contact?")) return;
    try {
      await axios.delete(`${api}/api/contacts/${id}`, authConfig);
      setContacts((c) => c.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        (err.response?.status === 403
          ? "Delete not allowed from this device"
          : "Delete failed");
      alert(msg);
    }
  };

  const handleSyncGoogle = () => {
    if (!isPrimaryDevice) {
      alert("Sync is allowed only from your registered (primary) device.");
      return;
    }
    if (!deviceId) {
      alert("Device ID not ready. Please try again later.");
      return;
    }
    window.location.href = `${api}/auth/google?deviceId=${encodeURIComponent(
      deviceId
    )}`;
  };

  const startAdd = () => {
    if (!isPrimaryDevice) {
      alert("Add is allowed only from your primary device.");
      return;
    }
    setShowAdd(true);
    setNewName("");
    setNewPhone("");
  };

  const submitAdd = async () => {
    if (!newPhone.trim()) {
      alert("Phone number is required");
      return;
    }
    let regex=/^[6789]{1}[0-9]{9}$/
    if(!regex.test(newPhone)){
      alert("Enter a valid Phone number");
      return;
    }
    try {
      const res = await axios.post(
        `${api}/api/contacts`,
        {
          name: newName,
          phone: newPhone,
        },
        authConfig
      );
      setContacts((prev) => [res.data, ...prev]);
      setShowAdd(false);
      setNewName("");
      setNewPhone("");
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        (err.response?.status === 403
          ? "Add not allowed from this device"
          : "Add failed");
      alert(msg);
    }
  };

  const startEdit = (c) => {
    if (!isPrimaryDevice) {
      alert("Edit is allowed only from your primary device.");
      return;
    }
    setEditingId(c.id);
    setEditName(c.name || "");
    setEditPhone(c.phone || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPhone("");
  };

  const submitEdit = async () => {
    if (!editingId) return;
    try {
      const res = await axios.put(
        `${api}/api/contacts/${editingId}`,
        {
          name: editName,
          phone: editPhone,
        },
        authConfig
      );
      const updated = res.data;
      setContacts((list) =>
        list.map((c) => (c.id === updated.id ? updated : c))
      );
      cancelEdit();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        (err.response?.status === 403
          ? "Update not allowed from this device"
          : "Update failed");
      alert(msg);
    }
  };

  const filtered = contacts.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="cp-root">
      <header className="cp-header">
        <div>
          <h1 className="cp-title">Swicall</h1>
          <p className="cp-subtitle">
            Secure lifeline contact manager{" "}
            {isPrimaryDevice === false ? "(view-only on this device)" : ""}
          </p>
        </div>
        <div className="cp-user">
          <div className="cp-user-info">
            <span className="cp-user-name">{username || "User"}</span>
            <span className="cp-user-email">{email}</span>
          </div>
          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="cp-main">
        <div className="cp-toolbar">
          <button className="btn-primary" onClick={handleSyncGoogle}>
            Sync from Google Contacts
          </button>

          {isPrimaryDevice && (
            <button className="btn-secondary" onClick={startAdd}>
              Add Contact
            </button>
          )}

          <button className="btn-secondary" onClick={loadContacts}>
            Reload contacts
          </button>

          <input
            className="cp-search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <div className="cp-error">{error}</div>}

        {showAdd && isPrimaryDevice && (
          <div className="cp-add-form">
            <input
              placeholder="Name"
              value={newName} required pattern="^[6789][0-9]{9}$"
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              placeholder="Phone number"
              value={newPhone}

              onChange={(e) => setNewPhone(e.target.value)}
            />
            <button className="cp-small-btn" onClick={submitAdd}>
              Save
            </button>
            <button
              className="cp-small-btn danger"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="cp-table-wrapper">
          <table className="cp-table">
            <thead>
              <tr>
                <th>S.no</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="cp-empty">
                    No contacts yet
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td>
                      {editingId === c.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td>
                      {editingId === c.id ? (
                        <input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                      ) : (
                        c.phone
                      )}
                    </td>
                    <td>
                      {editingId === c.id ? (
                        <>
                          <button className="cp-small-btn" onClick={submitEdit}>
                            Save
                          </button>
                          <button
                            className="cp-small-btn danger"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="cp-small-btn"
                            onClick={() => handleCopy(c.phone)}
                          >
                            Copy
                          </button>
                          {isPrimaryDevice && (
                            <>
                              <button
                                className="cp-small-btn"
                                onClick={() => startEdit(c)}
                              >
                                Edit
                              </button>
                              <button
                                className="cp-small-btn danger"
                                onClick={() => handleDelete(c.id)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default ContactsPage;
