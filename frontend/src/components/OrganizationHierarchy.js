import React, { useState, useEffect } from 'react';
import LeaveStatusDot from './LeaveStatusDot';

const OrganizationHierarchy = ({ user, onClose }) => {
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  useEffect(() => {
    if (user?.id) {
      fetchHierarchy();
    }
  }, [user]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all users
      const usersRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/`);
      const allUsers = await usersRes.json();

      // Build the hierarchy tree
      const tree = buildHierarchyTree(allUsers, user.id);
      setHierarchy(tree);

      // Auto-expand the path to current user
      const pathNodes = new Set();
      findPathToUser(tree, user.id, pathNodes);
      setExpandedNodes(pathNodes);

    } catch (err) {
      console.error('Error fetching hierarchy:', err);
      setError('Failed to load organizational hierarchy');
    } finally {
      setLoading(false);
    }
  };

  // In OrganizationHierarchy.js, replace the buildHierarchyTree function with this:

  const buildHierarchyTree = (users, currentUserId) => {
    // Filter out system admin from the hierarchy (but keep CEO even if they're Admin)
    const filteredUsers = users.filter(u => {
      if (u.role === 'Admin' && !u.designation?.toLowerCase().includes('ceo')) {
        return false; // Exclude non-CEO admins
      }
      return true;
    });

    // Create a map of users by ID and email for quick lookup
    const userMapById = new Map();
    const userMapByEmail = new Map();

    filteredUsers.forEach(u => {
      const userNode = { 
        ...u, 
        children: [], 
        isCurrentUser: String(u._id) === String(currentUserId) || String(u.id) === String(currentUserId)
      };
      userMapById.set(u._id, userNode);
      userMapByEmail.set(u.email.toLowerCase(), userNode);
    });

    // Build parent-child relationships - THIS IS KEY
    filteredUsers.forEach(u => {
      if (u.reportsToEmail && 
          u.reportsToEmail !== '' && 
          u.reportsToEmail.toLowerCase() !== u.email.toLowerCase()) {
      
        const managerEmail = u.reportsToEmail.toLowerCase();
        const manager = userMapByEmail.get(managerEmail);
        const employee = userMapByEmail.get(u.email.toLowerCase()) || userMapById.get(u._id);
      
        if (manager && employee && manager._id !== employee._id) {
          if (!manager.children.find(c => c._id === employee._id)) {
            manager.children.push(employee);
          }
        } else if (!manager) {
          console.warn(`⚠️ Manager with email ${u.reportsToEmail} not found for employee ${u.name}`);
        }
      }
    });

    // Find CEO - look for designation first, then no manager
    let ceo = Array.from(userMapById.values()).find(u => 
      u.designation?.toLowerCase().includes('ceo')
    );

    // If no CEO by designation, find person with no manager or self-reporting
    if (!ceo) {
      const topLevel = Array.from(userMapById.values()).filter(u => {
        const hasNoManager = !u.reportsToEmail || 
                            u.reportsToEmail === '' || 
                            u.reportsToEmail.toLowerCase() === u.email.toLowerCase();
        return hasNoManager;
      });
      
      // If only one top-level person, that's the CEO
      if (topLevel.length === 1) {
        ceo = topLevel[0];
      } else if (topLevel.length > 1) {
        // Multiple top-level: create virtual root
        ceo = {
          name: 'Organization',
          email: 'root',
          designation: 'Executive Leadership',
          role: 'System',
          children: topLevel,
          isVirtual: true,
          _id: 'virtual-root'
        };
      }
    }

    // Collect orphaned nodes (people whose manager was filtered out or doesn't exist)
    const findOrphans = () => {
      const allChildrenIds = new Set();
      const collectChildIds = (node) => {
        if (node.children) {
          node.children.forEach(child => {
            allChildrenIds.add(child._id);
            collectChildIds(child);
          });
        }
      };
      
      if (ceo) {
        allChildrenIds.add(ceo._id);
        collectChildIds(ceo);
      }
      
      const orphans = Array.from(userMapById.values()).filter(u => 
        !allChildrenIds.has(u._id)
      );
      
      return orphans;
    };

    const orphans = findOrphans().filter(o => {
      // Keep only those who truly have no valid manager reference
      return (
        !o.reportsToEmail ||
        o.reportsToEmail.trim() === '' ||
        o.reportsToEmail.toLowerCase() === o.email.toLowerCase() ||
        !userMapByEmail.has(o.reportsToEmail.toLowerCase())
      );
    });
    
    // Only attach *real* orphans (not ones already assigned properly)
    if (orphans.length > 0 && ceo && !ceo.isVirtual) {
      console.warn(`⚠️ Found ${orphans.length} valid orphaned employees, attaching to CEO`);
      orphans.forEach(orphan => {
        if (!ceo.children.find(c => c._id === orphan._id)) {
          ceo.children.push(orphan);
        }
      });
    }

    // Sort children recursively
    const sortChildren = (node) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        node.children.forEach(child => sortChildren(child));
      }
    };

    if (ceo) {
      sortChildren(ceo);
    }

    return ceo;
  };

  const findPathToUser = (node, targetId, pathNodes) => {
    if (!node) return false;
    
    // Check if this is the target user
    if (String(node._id) === String(targetId) || node.isCurrentUser) {
      pathNodes.add(node._id || node.email);
      return true;
    }

    // Search in children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (findPathToUser(child, targetId, pathNodes)) {
          pathNodes.add(node._id || node.email);
          return true;
        }
      }
    }

    return false;
  };

  const calculateLevel = (node, targetId, currentLevel = 0) => {
    if (!node) return -1;
  
    // Found the target
    if (String(node._id) === String(targetId) || node.isCurrentUser) {
       return node.isVirtual ? currentLevel : currentLevel;
    }

    // Search in children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const level = calculateLevel(child, targetId, node.isVirtual ? currentLevel : currentLevel + 1);
        if (level !== -1) return level;
      }
   }

    return -1;
  };

  const getEscalationPath = (node, targetId, path = []) => {
    if (!node) return null;
    
    // Found the target - return the path including this node
    if (String(node._id) === String(targetId) || node.isCurrentUser) {
      return [...path, node].reverse();
    }

    // Search in children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const result = getEscalationPath(child, targetId, [...path, node]);
        if (result) return result;
      }
    }

    return null;
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderNode = (node, level = 0, isLast = false, prefix = '') => {
    if (!node) return null;

    const nodeId = node._id || node.email;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children && node.children.length > 0;
    const isCurrentUser = String(node._id) === String(user.id) || node.isCurrentUser;
    const isVirtual = node.isVirtual;

    return (
      <div key={nodeId} style={{ marginLeft: level > 0 ? 40 : 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            marginBottom: 8,
            background: isCurrentUser 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : isVirtual 
              ? '#f3f4f6'
              : 'white',
            border: isCurrentUser 
              ? '2px solid #667eea'
              : '1px solid #e5e7eb',
            borderRadius: 12,
            cursor: hasChildren ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            position: 'relative',
          }}
          onClick={() => hasChildren && toggleNode(nodeId)}
          onMouseEnter={(e) => {
            if (!isCurrentUser) {
              e.currentTarget.style.transform = 'translateX(4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isCurrentUser) {
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {level > 0 && (
            <div
              style={{
                position: 'absolute',
                left: -20,
                top: '50%',
                width: 20,
                height: 2,
                background: '#d1d5db',
              }}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: isCurrentUser 
                    ? 'rgba(255,255,255,0.2)'
                    : isVirtual
                    ? '#d1d5db'
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16,
                  border: isCurrentUser ? '2px solid white' : 'none',
                }}
              >
                {node.name?.charAt(0) || '?'}
              </div>
              {!isVirtual && (
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'white', borderRadius: '50%', padding: 2 }}>
                  <LeaveStatusDot userId={node._id} size={10} />
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: isCurrentUser ? 'white' : '#111827',
                  marginBottom: 2,
                }}
              >
                {node.name}
                {isCurrentUser && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: '2px 8px',
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    YOU
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: isCurrentUser ? 'rgba(255,255,255,0.9)' : '#6b7280',
                }}
              >
                {node.designation}
                {node.role && node.role !== 'Employee' && (
                  <span style={{ marginLeft: 8 }}>• {node.role}</span>
                )}
              </div>
              {!isVirtual && (
                <div
                  style={{
                    fontSize: 11,
                    color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#9ca3af',
                    marginTop: 2,
                  }}
                >
                  {node.email}
                </div>
              )}
            </div>

            {hasChildren && (
              <div
                style={{
                  fontSize: 20,
                  color: isCurrentUser ? 'white' : '#9ca3af',
                  transition: 'transform 0.2s ease',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </div>
            )}

            {hasChildren && (
              <div
                style={{
                  padding: '4px 10px',
                  background: isCurrentUser 
                    ? 'rgba(255,255,255,0.2)'
                    : '#f3f4f6',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: isCurrentUser ? 'white' : '#6b7280',
                }}
              >
                {node.children.length} {node.children.length === 1 ? 'report' : 'reports'}
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div style={{ marginLeft: 0, position: 'relative' }}>
            {level > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: '#d1d5db',
                }}
              />
            )}
            {node.children.map((child, idx) =>
              renderNode(
                child,
                level + 1,
                idx === node.children.length - 1,
                prefix + (isLast ? '  ' : '│ ')
              )
            )}
          </div>
        )}
      </div>
    );
  };

  // Only calculate these after hierarchy is loaded
  const userLevel = hierarchy ? calculateLevel(hierarchy, user.id) : 0;
  const escalationPath = hierarchy ? getEscalationPath(hierarchy, user.id) : [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          maxWidth: 1200,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10,
          }}
        >
          <div>
            <h2 style={{ margin: 0, marginBottom: 4, fontSize: 24, fontWeight: 700, color: '#111827' }}>
              Organization Hierarchy
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
              View your position in the organizational structure and reporting chain
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: 'white',
              cursor: 'pointer',
              fontSize: 20,
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 32 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Loading organization chart...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{error}</div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Your Level</div>
                  <div style={{ fontSize: 36, fontWeight: 700 }}>
                    Level {userLevel >= 0 ? userLevel : 'N/A'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    {userLevel === 0 ? 'Top Level' : userLevel > 0 ? `${userLevel} ${userLevel === 1 ? 'level' : 'levels'} from top` : 'Position not found in hierarchy'}
                  </div>
                </div>

                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                    Escalation Path
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: '#10b981' }}>
                    {escalationPath && escalationPath.length > 0 ? escalationPath.length - 1 : 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    {escalationPath && escalationPath.length <= 1 ? 'No escalation needed' : 'managers in escalation path'}
                  </div>
                </div>

                <div
                style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 20,
                }}
                >
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                    Direct Reports
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#3b82f6' }}>
                    {(() => {
                    const findUserNode = (node) => {
                        if (!node) return null;
                        // Check if this is the current user
                        if (node._id === user.id || node.isCurrentUser) return node;
                        // Search in children
                        if (node.children && node.children.length > 0) {
                        for (const child of node.children) {
                            const found = findUserNode(child);
                            if (found) return found;
                        }
                        }
                        return null;
                    };
                    const userNode = hierarchy ? findUserNode(hierarchy) : null;
                    return userNode?.children?.length || 0;
                    })()}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    people reporting to you
                </div>
                </div>
              </div>

              {/* Escalation Path */}
              {escalationPath && escalationPath.length > 1 && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '2px solid #fbbf24',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24,
                  }}
                >
                  <h4 style={{ margin: 0, marginBottom: 16, color: '#92400e' }}>
                    📊 Your Escalation Path
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {escalationPath.map((person, idx) => (
                      <React.Fragment key={person.email || person._id}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 16px',
                            background: person._id === user.id ? '#fef3c7' : 'white',
                            borderRadius: 8,
                            border: person._id === user.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: person._id === user.id 
                                ? '#f59e0b'
                                : 'linear-gradient(135deg, #667eea, #764ba2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {person.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                              {person.name}
                              {person._id === user.id && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 10,
                                    color: '#92400e',
                                    fontWeight: 700,
                                  }}
                                >
                                  (YOU)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                              {person.designation}
                            </div>
                          </div>
                        </div>
                        {idx < escalationPath.length - 1 && (
                          <div style={{ fontSize: 20, color: '#d97706' }}>→</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: 'white',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#6b7280',
                    }}
                  >
                    💡 <strong>Tip:</strong> If your immediate manager is unavailable, escalate to the next
                    person in the chain. Contact details are shown in the hierarchy below.
                  </div>
                </div>
              )}

              {/* Hierarchy Tree */}
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                    Organization Chart
                  </h4>
                  <button
                    onClick={() => {
                      const pathNodes = new Set();
                      findPathToUser(hierarchy, user.id, pathNodes);
                      setExpandedNodes(pathNodes);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#374151',
                    }}
                  >
                    🔄 Show My Path
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {hierarchy && renderNode(hierarchy)}
                </div>
              </div>

              {/* Legend */}
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  display: 'flex',
                  gap: 20,
                  flexWrap: 'wrap',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      borderRadius: 4,
                      border: '2px solid #667eea',
                    }}
                  />
                  <span style={{ color: '#6b7280' }}>Your Position</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: 'white',
                      borderRadius: 4,
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  <span style={{ color: '#6b7280' }}>Other Employees</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>▼</span>
                  <span style={{ color: '#6b7280' }}>Click to expand/collapse</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationHierarchy;