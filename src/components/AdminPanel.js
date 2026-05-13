import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { get, put } from 'aws-amplify/api';

function AdminPanel() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tab, setTab] = useState('groups');
  const [editGroup, setEditGroup] = useState(null);
  const [newGroup, setNewGroup] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const response = await get({
        apiName: 'S3BrowserAPI', path: '/admin/config',
        options: { headers: { Authorization: `Bearer ${session.tokens.idToken}` } }
      }).response;
      const data = await response.body.json();
      setConfig(data);
    } catch (e) {
      setError(e.message || 'Failed to load config. Admin access required.');
    } finally { setLoading(false); }
  };

  const saveConfig = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const session = await fetchAuthSession();
      await put({
        apiName: 'S3BrowserAPI', path: '/admin/config',
        options: {
          headers: { Authorization: `Bearer ${session.tokens.idToken}`, 'Content-Type': 'application/json' },
          body: config
        }
      }).response;
      setSuccess('Config saved! Changes apply within 5 minutes.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e.message || 'Failed to save config');
    } finally { setSaving(false); }
  };

  const addGroup = (name, desc) => {
    setConfig(prev => ({ ...prev, groups: { ...prev.groups, [name]: { description: desc, buckets: [] } } }));
    setNewGroup(false);
    setEditGroup(name);
  };

  const deleteGroup = (name) => {
    if (!window.confirm(`Delete group "${name}"?`)) return;
    setConfig(prev => { const groups = { ...prev.groups }; delete groups[name]; return { ...prev, groups }; });
  };

  const updateGroup = (name, group) => {
    setConfig(prev => ({ ...prev, groups: { ...prev.groups, [name]: group } }));
  };

  const addAccount = (account, role, name) => {
    setConfig(prev => ({ ...prev, cross_account_roles: [...prev.cross_account_roles, { account, role: role || null, name }] }));
  };

  const deleteAccount = (idx) => {
    if (!window.confirm('Remove this account?')) return;
    setConfig(prev => ({ ...prev, cross_account_roles: prev.cross_account_roles.filter((_, i) => i !== idx) }));
  };

  if (loading) return <div style={s.page}><div style={s.loader}>Loading admin config...</div></div>;
  if (error && !config) return <div style={s.page}><div style={s.error}>❌ {error}<br/><br/><a href="/" style={{color:'#007aff'}}>← Back to S3 Browser</a></div></div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>⚙️ S3 Browser Admin</h1>
        <button style={s.saveBtn} onClick={saveConfig} disabled={saving}>{saving ? 'Saving...' : '💾 Save Config'}</button>
      </div>
      {error && <div style={s.error}>❌ {error}</div>}
      {success && <div style={s.success}>✅ {success}</div>}
      <div style={s.tabs}>
        <button style={tab === 'groups' ? s.tabActive : s.tab} onClick={() => setTab('groups')}>Groups ({Object.keys(config.groups).length})</button>
        <button style={tab === 'accounts' ? s.tabActive : s.tab} onClick={() => setTab('accounts')}>Accounts ({config.cross_account_roles.length})</button>
      </div>
      {tab === 'groups' && (
        <div>
          <button style={s.addBtn} onClick={() => setNewGroup(true)}>+ Add Group</button>
          {newGroup && <NewGroupForm onAdd={addGroup} onCancel={() => setNewGroup(false)} />}
          <div style={s.table}>
            {Object.entries(config.groups).map(([name, group]) => (
              <div key={name} style={s.row}>
                <div style={s.rowMain} onClick={() => setEditGroup(editGroup === name ? null : name)}>
                  <div style={s.groupName}>{name}</div>
                  <div style={s.groupDesc}>{group.description || '-'}</div>
                  <div style={s.groupBuckets}>{group.buckets.length} bucket rule(s)</div>
                </div>
                <button style={s.delBtn} onClick={() => deleteGroup(name)}>🗑️</button>
                {editGroup === name && <GroupEditor group={group} onChange={(g) => updateGroup(name, g)} />}
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'accounts' && (
        <div>
          <NewAccountForm onAdd={addAccount} />
          <div style={s.table}>
            {config.cross_account_roles.map((acct, i) => (
              <div key={i} style={s.row}>
                <div style={s.rowMain}>
                  <div style={s.groupName}>{acct.account}</div>
                  <div style={s.groupDesc}>{acct.name || '-'}</div>
                  <div style={s.groupBuckets}>{acct.role || 'Primary (no role)'}</div>
                </div>
                <button style={s.delBtn} onClick={() => deleteAccount(i)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewGroupForm({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <div style={s.form}>
      <input style={s.input} placeholder="Group name (must match IAM Identity Center)" value={name} onChange={e => setName(e.target.value)} />
      <input style={s.input} placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
      <button style={s.addBtn} onClick={() => name && onAdd(name, desc)}>Add</button>
      <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
    </div>
  );
}

function NewAccountForm({ onAdd }) {
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  return (
    <div style={s.form}>
      <input style={s.input} placeholder="Account ID (12 digits)" value={account} onChange={e => setAccount(e.target.value)} />
      <input style={s.input} placeholder="Friendly name" value={name} onChange={e => setName(e.target.value)} />
      <button style={s.addBtn} onClick={() => { if (account.length === 12) { onAdd(account, `arn:aws:iam::${account}:role/S3BrowserCrossAccountRole`, name); setAccount(''); setName(''); } }}>+ Add Account</button>
    </div>
  );
}

function GroupEditor({ group, onChange }) {
  const addBucket = () => onChange({ ...group, buckets: [...group.buckets, { pattern: '', permission: 'read' }] });
  const updateBucket = (idx, field, value) => { const buckets = [...group.buckets]; buckets[idx] = { ...buckets[idx], [field]: value }; onChange({ ...group, buckets }); };
  const removeBucket = (idx) => onChange({ ...group, buckets: group.buckets.filter((_, i) => i !== idx) });
  return (
    <div style={s.editor}>
      <div style={s.editorTitle}>Bucket Rules</div>
      {group.buckets.map((b, i) => (
        <div key={i} style={s.bucketRow}>
          <input style={s.inputSm} placeholder="Bucket pattern" value={b.pattern} onChange={e => updateBucket(i, 'pattern', e.target.value)} />
          <select style={s.select} value={b.permission} onChange={e => updateBucket(i, 'permission', e.target.value)}>
            <option value="read">Read</option>
            <option value="write">Write</option>
          </select>
          <input style={s.inputSm} placeholder="Account (optional)" value={b.account || ''} onChange={e => updateBucket(i, 'account', e.target.value)} />
          <input style={s.inputSm} placeholder="Prefix (optional)" value={b.prefix || ''} onChange={e => updateBucket(i, 'prefix', e.target.value)} />
          <button style={s.delBtnSm} onClick={() => removeBucket(i)}>✕</button>
        </div>
      ))}
      <button style={s.addBtnSm} onClick={addBucket}>+ Add Bucket Rule</button>
    </div>
  );
}

const s = {
  page: { maxWidth: 1000, margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 600, margin: 0 },
  saveBtn: { padding: '10px 24px', background: '#34c759', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e5ea', paddingBottom: 8 },
  tab: { padding: '8px 16px', background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', fontSize: 14, borderRadius: 8 },
  tabActive: { padding: '8px 16px', background: '#007aff', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, borderRadius: 8, fontWeight: 600 },
  table: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#f9f9f9', border: '1px solid #e5e5ea', borderRadius: 12, padding: 16, position: 'relative' },
  rowMain: { cursor: 'pointer' },
  groupName: { fontSize: 15, fontWeight: 600, color: '#1c1c1e' },
  groupDesc: { fontSize: 13, color: '#8e8e93', marginTop: 2 },
  groupBuckets: { fontSize: 12, color: '#007aff', marginTop: 4 },
  delBtn: { position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' },
  addBtn: { padding: '8px 16px', background: '#007aff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', marginBottom: 12 },
  cancelBtn: { padding: '8px 16px', background: '#e5e5ea', color: '#1c1c1e', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  form: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '8px 12px', border: '1px solid #d1d1d6', borderRadius: 8, fontSize: 14, flex: 1, minWidth: 200 },
  editor: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e5ea' },
  editorTitle: { fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 8, textTransform: 'uppercase' },
  bucketRow: { display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' },
  inputSm: { padding: '6px 10px', border: '1px solid #d1d1d6', borderRadius: 6, fontSize: 13, flex: 1, minWidth: 120 },
  select: { padding: '6px 10px', border: '1px solid #d1d1d6', borderRadius: 6, fontSize: 13 },
  delBtnSm: { background: '#ff3b30', color: '#fff', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: 12 },
  addBtnSm: { padding: '6px 12px', background: '#e5e5ea', color: '#1c1c1e', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginTop: 4 },
  error: { padding: '12px 16px', background: '#fff2f2', color: '#ff3b30', borderRadius: 8, marginBottom: 16, fontSize: 13 },
  success: { padding: '12px 16px', background: '#f0fff4', color: '#34c759', borderRadius: 8, marginBottom: 16, fontSize: 13 },
  loader: { textAlign: 'center', padding: 48, color: '#8e8e93' }
};

export default AdminPanel;
