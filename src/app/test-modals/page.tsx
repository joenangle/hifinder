'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export default function TestModalsPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateStackModal, setShowCreateStackModal] = useState(false)

  return (
    <div className="min-h-screen p-8" style={{backgroundColor: 'var(--background-primary)', color: 'var(--text-primary)'}}>
      <h1 className="heading-1">Modal Design System Test</h1>
      
      <div className="space-y-4">
        <button onClick={() => setShowAddModal(true)} className="button button-primary">
          Test Add Gear Modal
        </button>
        <button onClick={() => setShowEditModal(true)} className="button button-primary">
          Test Edit Gear Modal  
        </button>
        <button onClick={() => setShowCreateStackModal(true)} className="button button-primary">
          Test Create Stack Modal
        </button>
      </div>

      {/* Add Gear Modal */}
      {showAddModal && (
        <div className="modal-backdrop animate-fadeIn" onClick={() => setShowAddModal(false)}>
          <div className="modal-container animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Gear</h2>
              <button onClick={() => setShowAddModal(false)} className="modal-close" aria-label="Close modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="form-helper">* Required fields</p>
              
              <div className="modal-tabs">
                <button className="modal-tab active">Search Database</button>
                <button className="modal-tab">Custom Entry</button>
              </div>

              <div className="form-group">
                <label className="label">Search for Component</label>
                <input type="text" placeholder="Search by brand or model..." className="input" />
              </div>

              <h3 className="heading-4 mb-4">Purchase Details</h3>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="label">Purchase Date</label>
                  <input type="date" className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Price Paid</label>
                  <input type="number" placeholder="0.00" className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Condition</label>
                  <select className="input">
                    <option>New</option>
                    <option>Used</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Purchase Location</label>
                  <input type="text" placeholder="e.g., Amazon" className="input" />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowAddModal(false)} className="button button-secondary">Cancel</button>
              <button className="button button-primary">Add to Collection</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Gear Modal */}
      {showEditModal && (
        <div className="modal-backdrop animate-fadeIn" onClick={() => setShowEditModal(false)}>
          <div className="modal-container animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Edit Gear</h2>
                <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>Sony WH-1000XM5</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="modal-close" aria-label="Close modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
              <h3 className="heading-4 mb-4">Purchase Details</h3>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="label">Purchase Date</label>
                  <input type="date" className="input" defaultValue="2024-01-15" />
                </div>
                <div className="form-group">
                  <label className="label">Price Paid</label>
                  <input type="number" className="input" defaultValue="299" />
                </div>
                <div className="form-group">
                  <label className="label">Condition</label>
                  <select className="input" defaultValue="used">
                    <option value="new">New</option>
                    <option value="used">Used</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Purchase Location</label>
                  <input type="text" className="input" defaultValue="Amazon" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Notes</label>
                  <textarea className="input" rows={3} defaultValue="Great noise cancelling"></textarea>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowEditModal(false)} className="button button-secondary">Cancel</button>
              <button className="button button-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Stack Modal */}
      {showCreateStackModal && (
        <div className="modal-backdrop animate-fadeIn" onClick={() => setShowCreateStackModal(false)}>
          <div className="modal-container animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Stack</h2>
              <button onClick={() => setShowCreateStackModal(false)} className="modal-close" aria-label="Close modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              <p className="form-helper">* Required fields</p>
              
              <div className="form-group">
                <label className="label label-required">Stack Name</label>
                <input type="text" placeholder="e.g., Desktop Setup" className="input" />
              </div>
              
              <div className="form-group">
                <label className="label">Description</label>
                <textarea placeholder="Describe your stack..." className="input" rows={3}></textarea>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowCreateStackModal(false)} className="button button-secondary">Cancel</button>
              <button className="button button-primary">Create Stack</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}