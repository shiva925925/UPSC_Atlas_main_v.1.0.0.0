import React, { useState, useEffect, useMemo } from 'react';
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
    fetch(`/api/library?t=${Date.now()}`)
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

  const groupedResources = useMemo(() => {
    return filteredUserResources.reduce((acc, resource) => {
      (acc[resource.subject] = acc[resource.subject] || []).push(resource);
      return acc;
    }, {} as Record<Subject, Resource[]>);
  }, [filteredUserResources]);


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
      case ResourceType.PDF: return <FileText size={16} className="text-red-500" />;
      case ResourceType.LINK: return <LinkIcon size={16} className="text-blue-500" />;
      case ResourceType.VIDEO: return <Video size={16} className="text-purple-500" />;
      case ResourceType.IMAGE: return <ImageIcon size={16} className="text-green-500" />;
    }
  };

  const allSyllabusResources = libraryResources.filter(r => r.path);

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-fade-in bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
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
      <div className="flex-shrink-0 flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search syllabus tree and resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border bg-white border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
        <div className="lg:col-span-1 bg-white p-3 rounded-lg border border-gray-200 overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 px-2">Syllabus Explorer</h3>
          <LibraryTree
            resources={allSyllabusResources}
            searchQuery={searchQuery}
            onSelectResource={handleSelectResource}
            selectedResource={selectedResource}
          />
        </div>

        {/* Right Column: Contextual Panel or Board */}
        <div className="lg:col-span-2 min-h-0 flex flex-col">
          {selectedResource ? (
            <DetailPanel
              selectedResource={selectedResource}
              allResources={allSyllabusResources}
              onClose={handleClosePanel}
              onSelectResource={handleSelectResource}
            />
          ) : (
            <div className="h-full flex flex-col">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex-shrink-0">My Resources</h3>
              {/* List Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-5">Resource</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Subject</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Resource List Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredUserResources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <p>No custom resources found. Add one to get started!</p>
                  </div>
                ) : (
                  filteredUserResources.map(resource => (
                    <div
                      key={resource.id}
                      className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 items-center hover:bg-blue-50/50 transition-colors group"
                    >
                      {/* Resource Title */}
                      <div className="col-span-5">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{resource.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-1">{resource.description || 'No description'}</p>
                      </div>

                      {/* Type */}
                      <div className="col-span-2 flex items-center gap-1">
                        {getIcon(resource.type)}
                        <span className="text-xs font-medium text-gray-700">{resource.type}</span>
                      </div>

                      {/* Subject */}
                      <div className="col-span-2">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: SUBJECT_COLORS[resource.subject] }}
                        >
                          {resource.subject}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="col-span-2 text-sm text-gray-500">
                        {resource.date && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon size={14} />
                            <span>{resource.date}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(resource)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(resource.id)} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 size={16} /></button>
                        <button onClick={() => handleOpenResource(resource)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Open"><ExternalLink size={16} /></button>
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