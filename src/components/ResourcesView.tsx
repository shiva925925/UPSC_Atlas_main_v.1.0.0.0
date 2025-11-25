import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SUBJECT_COLORS } from '../constants';
import { Resource, ResourceType, Subject } from '../types';
import { FileText, Link as LinkIcon, Video, Plus, ExternalLink, Search, Filter, Calendar as CalendarIcon, X, Trash2, Edit2, Image as ImageIcon, Grid3x3, Network } from 'lucide-react';
import LibraryTree from './LibraryTree';

const ResourcesView: React.FC = () => {
  // Fetch dynamic resources from DB
  const dbResources = useLiveQuery(() => db.resources.toArray()) || [];

  // State for static library resources
  const [libraryResources, setLibraryResources] = useState<Resource[]>([]);

  const [filterSubject, setFilterSubject] = useState<Subject | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');

  // New Resource Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ResourceType>(ResourceType.LINK);
  const [newSubject, setNewSubject] = useState<Subject>(Subject.POLITY);
  const [newUrl, setNewUrl] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load static library on mount - AUTO-SCANS public/library folder
  useEffect(() => {
    fetch('/api/library')
      .then(res => res.json())
      .then(data => {
        // Map the API response to full Resource objects
        const mapped: Resource[] = data.map((item: any) => ({
          id: item.id,
          userId: 'Schamala',
          title: item.title,
          type: ResourceType.PDF,
          subject: item.subject as Subject || Subject.SYLLABUS,
          url: `/library/${item.path || item.filename}`,
          description: item.description,
          path: item.path // Add path for tree structure
        }));
        setLibraryResources(mapped);
      })
      .catch(err => console.error("Failed to load library:", err));
  }, []);

  const allResources = [...libraryResources, ...dbResources];

  const filteredResources = allResources.filter(r => {
    const matchesSubject = filterSubject === 'ALL' || r.subject === filterSubject;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const resetForm = () => {
    setNewTitle('');
    setNewType(ResourceType.LINK);
    setNewSubject(Subject.POLITY);
    setNewUrl('');
    setNewDate('');
    setNewDescription('');
    setSelectedFile(null);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setNewTitle(file.name.split('.')[0]); // Auto-fill title
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();

    const resourceData: Partial<Resource> = {
      title: newTitle,
      type: newType,
      subject: newSubject,
      url: newUrl || (selectedFile ? URL.createObjectURL(selectedFile) : ''), // Fallback URL for display
      date: newDate || undefined,
      description: newDescription,
      content: selectedFile || undefined
    };

    if (editingId) {
      // Update existing
      await db.resources.update(editingId, resourceData);
    } else {
      // Add new
      const newResource: Resource = {
        id: Math.random().toString(36).substr(2, 9),
        userId: 'Schamala',
        title: newTitle,
        type: newType,
        subject: newSubject,
        url: newUrl || (selectedFile ? 'local-file' : ''),
        date: newDate || undefined,
        description: newDescription,
        content: selectedFile || undefined
      };
      await db.resources.add(newResource);
    }
    resetForm();
  };

  const handleEdit = (resource: Resource) => {
    setNewTitle(resource.title);
    setNewType(resource.type);
    setNewSubject(resource.subject);
    setNewUrl(resource.url);
    setNewDate(resource.date || '');
    setNewDescription(resource.description || '');
    setEditingId(resource.id);
    // Note: We don't restore the file object for editing as we can't programmatically set file input
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      await db.resources.delete(id);
    }
  };

  const handleOpenResource = (resource: Resource) => {
    if (resource.content) {
      const url = URL.createObjectURL(resource.content);
      window.open(url, '_blank');
    } else {
      window.open(resource.url, '_blank');
    }
  };

  const getIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.PDF: return <FileText size={20} className="text-red-500" />;
      case ResourceType.LINK: return <LinkIcon size={20} className="text-blue-500" />;
      case ResourceType.VIDEO: return <Video size={20} className="text-purple-500" />;
      case ResourceType.IMAGE: return <ImageIcon size={20} className="text-green-500" />;
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Study Library</h2>
          <p className="text-gray-500">Centralize your PDFs, links, and study materials.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-md p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <Grid3x3 size={16} />
              <span className="text-sm font-medium">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${viewMode === 'tree' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <Network size={16} />
              <span className="text-sm font-medium">Tree</span>
            </button>
          </div>

          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors w-full md:w-auto justify-center"
          >
            <Plus size={18} />
            <span>Add Resource</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 bg-white border border-gray-300 px-3 py-2 rounded-md">
          <Filter size={18} className="text-gray-500" />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value as Subject | 'ALL')}
            className="bg-transparent outline-none text-sm text-gray-700 font-medium cursor-pointer w-full md:w-auto"
          >
            <option value="ALL">All Subjects</option>
            {Object.values(Subject).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal for Adding/Editing Resource */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Resource' : 'Add New Resource'}</h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ResourceType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(ResourceType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value as Subject)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(Subject).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Upload or URL Input */}
              {(newType === ResourceType.PDF || newType === ResourceType.IMAGE) ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                  <input
                    type="file"
                    accept={newType === ResourceType.PDF ? ".pdf" : "image/*"}
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">File will be stored locally in your browser.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    required
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Fundamental Rights Notes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Associate Date (Optional)</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                  placeholder="Brief description..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  {editingId ? 'Update Resource' : 'Save Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resources Grid or Tree View */}
      {viewMode === 'tree' ? (
        <LibraryTree resources={libraryResources.filter(r => r.path)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
          {filteredResources.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <p>No resources found matching your criteria.</p>
            </div>
          ) : (
            filteredResources.map(resource => {
              // Check if it's a user-created resource (not from library - 'lib_' or 'lib_auto_' prefix)
              const isUserResource = !resource.id.startsWith('lib_');

              return (
                <div key={resource.id} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                        {getIcon(resource.type)}
                      </div>
                      <div>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: SUBJECT_COLORS[resource.subject] }}
                        >
                          {resource.subject}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUserResource && (
                        <>
                          <button
                            onClick={() => handleEdit(resource)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(resource.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleOpenResource(resource)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Open"
                      >
                        <ExternalLink size={18} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{resource.title}</h3>

                  <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-3">
                    {resource.description || 'No description provided.'}
                  </p>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      {resource.date && (
                        <>
                          <CalendarIcon size={14} />
                          <span>{resource.date}</span>
                        </>
                      )}
                    </div>
                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium">{resource.type}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ResourcesView;