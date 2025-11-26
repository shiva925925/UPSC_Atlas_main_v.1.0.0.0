import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SUBJECT_COLORS } from '../constants';
import { Resource, ResourceType, Subject } from '../types';
import { FileText, Link as LinkIcon, Video, Plus, ExternalLink, Search, Filter, Calendar as CalendarIcon, X, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import LibraryTree from './LibraryTree';
import DetailPanel from './DetailPanel';

const ResourcesView: React.FC = () => {
  const dbResources = useLiveQuery(() => db.resources.toArray()) || [];
  const [libraryResources, setLibraryResources] = useState<Resource[]>([]);
  const [filterSubject, setFilterSubject] = useState<Subject | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ResourceType>(ResourceType.LINK);
  const [newSubject, setNewSubject] = useState<Subject>(Subject.POLITY);
  const [newUrl, setNewUrl] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetch('/api/library')
      .then(res => res.json())
      .then(data => {
        const mapped: Resource[] = data.map((item: any) => ({
          id: item.id,
          userId: 'Schamala',
          title: item.title,
          type: ResourceType.PDF,
          subject: item.subject as Subject || Subject.SYLLABUS,
          url: `/library/${item.path || item.filename}`,
          description: item.description,
          path: item.path
        }));
        setLibraryResources(mapped);
      })
      .catch(err => console.error("Failed to load library:", err));
  }, []);

  const handleSelectResource = (resource: Resource) => {
    setSelectedResource(resource);
  };

  const handleClosePanel = () => {
    setSelectedResource(null);
  };

  const filteredUserResources = dbResources.filter(r => {
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
      setNewTitle(file.name.split('.')[0]);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to add/update resource in DB
    resetForm();
  };

  const handleEdit = (resource: Resource) => {
    // Logic to set form for editing
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

  const allSyllabusResources = libraryResources.filter(r => r.path);

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-fade-in">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Study Library</h2>
          <p className="text-gray-500">Explore the syllabus tree and manage your custom resources.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors w-full md:w-auto justify-center"
        >
          <Plus size={18} />
          <span>Add Resource</span>
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search syllabus tree and resources..."
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
            {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Main Content: 2-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
        {/* Left Column: Syllabus Tree */}
        <div className="lg:col-span-1 bg-gray-50 p-3 rounded-lg overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 px-2">Syllabus Explorer</h3>
          <LibraryTree 
            resources={allSyllabusResources} 
            searchQuery={searchQuery} 
            onSelectResource={handleSelectResource}
            selectedResource={selectedResource}
          />
        </div>

        {/* Right Column: Contextual Panel or Grid */}
        <div className="lg:col-span-2 min-h-0">
          {selectedResource ? (
            <DetailPanel 
              selectedResource={selectedResource}
              allResources={allSyllabusResources}
              onClose={handleClosePanel}
              onSelectResource={handleSelectResource}
            />
          ) : (
            <div className="h-full overflow-y-auto custom-scrollbar -mr-4 pr-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">My Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                {filteredUserResources.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <p>No custom resources found. Add one to get started!</p>
                  </div>
                ) : (
                    filteredUserResources.map(resource => (
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
                            <button onClick={() => handleEdit(resource)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(resource.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                            <button onClick={() => handleOpenResource(resource)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Open"><ExternalLink size={18} /></button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{resource.title}</h3>
                      <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-3">{resource.description || 'No description provided.'}</p>
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">{resource.date && <><CalendarIcon size={14} /><span>{resource.date}</span></>}</div>
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium">{resource.type}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal for Adding/Editing Resource */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Resource' : 'Add New Resource'}</h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            {/* Form content remains the same */}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesView;