import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { SUBJECT_HIERARCHY, CATEGORY_COLORS } from '../constants';
import { Resource, ResourceType, Subject, SubjectCategory } from '../types';
import { FileText, Link as LinkIcon, Video, Plus, ExternalLink, Search, Filter, Calendar as CalendarIcon, X, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import LibraryTree from './LibraryTree';
import DetailPanel from './DetailPanel';
import GlassCard from './ui/GlassCard';
import EmptyState from './ui/EmptyState';

import { uploadFile } from '../services/uploadService';
import { ensureProtocol } from '../utils/urlHelper';

interface ResourcesViewProps {
  onNavigateToTask?: (taskId: string) => void;
}

const ResourcesView: React.FC<ResourcesViewProps> = ({ onNavigateToTask }) => {
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<SubjectCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ResourceType>(ResourceType.LINK);
  const [newSubject, setNewSubject] = useState<Subject>(Subject.GENERAL);
  const [newUrl, setNewUrl] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/resources?t=${Date.now()}`);
      const data = await res.json();
      setAllResources(data.resources || []);
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAndMigrate = async () => {
      try {
        // 1. Check for local IndexedDB resources (Legacy)
        const localResources = await db.resources.toArray();
        if (localResources.length > 0) {
          console.log(`[Sync] Migrating ${localResources.length} local resources to server...`);
          for (const res of localResources) {
            await fetch('/api/resources', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(res)
            });
          }
          await db.resources.clear();
          console.log("[Sync] Migration complete.");
        }
      } catch (e) {
        console.warn("Migration check failed:", e);
      }

      // 2. Fetch from Master Cache
      fetchResources();
    };

    initAndMigrate();
  }, []);

  const handleSelectResource = (resource: Resource) => {
    setSelectedResource(resource);
  };

  const handleClosePanel = () => {
    setSelectedResource(null);
  };



  const filteredResources = allResources.filter(r => {
    const subjectCategory = SUBJECT_HIERARCHY[r.subject] || SubjectCategory.GENERAL;
    const matchesSubject = filterSubject === 'ALL' || subjectCategory === filterSubject;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const groupedResources = useMemo(() => {
    return filteredResources.filter(r => !r.isAuto).reduce((acc, resource) => {
      (acc[resource.subject] = acc[resource.subject] || []).push(resource);
      return acc;
    }, {} as Record<Subject, Resource[]>);
  }, [filteredResources]);


  const resetForm = () => {
    setNewTitle('');
    setNewType(ResourceType.LINK);
    setNewSubject(Subject.GENERAL);
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
    setIsSubmitting(true);

    try {
      let resourceUrl = newUrl;

      // Handle File Upload if applicable
      if ((newType === ResourceType.PDF || newType === ResourceType.IMAGE) && selectedFile) {
        const uploadResult = await uploadFile(selectedFile);
        resourceUrl = uploadResult.url;
      }

      const newResource: Resource = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        userId: 'Schamala',
        title: newTitle,
        type: newType,
        subject: newSubject,
        url: resourceUrl,
        date: newDate || new Date().toISOString().split('T')[0],
        description: newDescription,
        isAuto: false
      };

      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResource)
      });

      if (!res.ok) throw new Error('Failed to save to server');

      alert(`✅ Resource ${editingId ? 'updated' : 'added'} successfully!`);
      resetForm();
      fetchResources();
    } catch (error) {
      console.error("Failed to add resource:", error);
      alert(`❌ Failed to ${editingId ? 'update' : 'add'} resource. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    // Populate form with existing resource data
    setEditingId(resource.id);
    setNewTitle(resource.title);
    setNewType(resource.type);
    setNewSubject(resource.subject);
    setNewUrl(resource.url);
    setNewDate(resource.date || '');
    setNewDescription(resource.description || '');
    setSelectedFile(null); // Can't pre-populate file input for security reasons
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        fetchResources();
      } catch (e) {
        alert("Failed to delete resource");
      }
    }
  };

  const handleOpenResource = (resource: Resource) => {
    if (resource.content) {
      const url = URL.createObjectURL(resource.content);
      window.open(url, '_blank');
    } else {
      window.open(ensureProtocol(resource.url), '_blank');
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

  const allSyllabusResources = allResources.filter(r => r.isAuto);
  const userResources = allResources.filter(r => !r.isAuto);

  const filteredUserResources = filteredResources.filter(r => !r.isAuto);

  return (
    <div className="p-4 md:p-8 h-full flex flex-col animate-fade-in gap-6 bg-app-bg transition-colors duration-300">
      {/* Header */}
      <header className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 bg-card-bg/40 backdrop-blur-xl p-4 rounded-xl shadow-sm border border-card-border transition-colors">
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight">Study Library</h2>
        </div>
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition-all w-full md:w-auto justify-center shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={18} />
          <span>Add Resource</span>
        </button>
      </header>

      {/* Filters */}
      <div className="flex-shrink-0 flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search syllabus tree and resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border bg-card-bg/30 border-card-border rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-text-main placeholder-text-muted transition-all"
          />
        </div>
        <div className="flex items-center space-x-2 bg-card-bg/30 border border-card-border px-3 py-2 rounded-xl">
          <Filter size={18} className="text-text-muted" />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value as SubjectCategory | 'ALL')}
            className="bg-transparent outline-none text-sm text-text-main font-bold cursor-pointer w-full md:w-auto"
          >
            <option value="ALL" className="bg-app-bg">All Subjects</option>
            {Object.values(SubjectCategory).map(cat => <option key={cat} value={cat} className="bg-app-bg">{cat}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column: Syllabus Tree */}
        <GlassCard variant="opaque" className="w-1/3 p-4 overflow-y-auto custom-scrollbar border-card-border">
          <h3 className="text-lg font-bold text-text-main mb-3 px-2">Syllabus Explorer</h3>
          <LibraryTree
            resources={allSyllabusResources}
            searchQuery={searchQuery}
            onSelectResource={handleSelectResource}
            selectedResource={selectedResource}
          />
        </GlassCard>

        {/* Right Column: Contextual Panel or Board */}
        <div className="flex-1 flex flex-col h-full">{/* Changed from lg:col-span-2 to flex-1 */}
          {selectedResource ? (
            <DetailPanel
              selectedResource={selectedResource}
              allResources={allSyllabusResources}
              onClose={handleClosePanel}
              onSelectResource={handleSelectResource}
              onNavigateToTask={onNavigateToTask}
            />
          ) : (
            <GlassCard variant="blur" className="h-full flex flex-col border-card-border shadow-xl">
              <div className="p-4 border-b border-card-border/50 bg-white/5">
                <h3 className="text-lg font-bold text-text-main">My Resources</h3>
              </div>

              {/* List Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/5 border-b border-card-border text-[10px] font-black text-text-muted uppercase tracking-widest">
                <div className="col-span-5">Resource</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Subject</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Resource List Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredUserResources.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No Resources Found"
                    message="Your study library is empty. Add a new resource to get started!"
                    actionLabel="Add Resource"
                    onAction={() => { resetForm(); setIsAdding(true); }}
                  />
                ) : (
                  filteredUserResources.map(resource => {
                    const resourceSubjectCategory = SUBJECT_HIERARCHY[resource.subject] || SubjectCategory.GENERAL;
                    const resourceColors = CATEGORY_COLORS[resourceSubjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];
                    return (
                      <div
                        key={resource.id}
                        className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-card-border/50 items-center hover:bg-white/5 transition-all group cursor-pointer"
                        onClick={() => handleSelectResource(resource)}
                      >
                        {/* Resource Title */}
                        <div className="col-span-5">
                          <h4 className="text-sm font-bold text-text-main group-hover:text-blue-500 transition-colors leading-tight">{resource.title}</h4>
                          <p className="text-xs text-text-muted line-clamp-1 mt-1 font-medium">{resource.description || 'No description'}</p>
                        </div>

                        {/* Type */}
                        <div className="col-span-2 flex items-center gap-2">
                          {getIcon(resource.type)}
                          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{resource.type}</span>
                        </div>

                        {/* Subject */}
                        <div className="col-span-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${resourceColors.background} ${resourceColors.text}`}
                          >
                            {resource.subject}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="col-span-2 text-xs text-text-muted font-mono">
                          {resource.date && (
                            <div className="flex items-center gap-2">
                              <CalendarIcon size={14} className="opacity-50" />
                              <span>{resource.date}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(resource); }} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Edit"><Edit2 size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(resource.id); }} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleOpenResource(resource); }} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Open"><ExternalLink size={16} /></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>

          )}
        </div>
      </div>

      {/* Modal for Adding/Editing Resource */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-card-bg border border-card-border rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-text-main tracking-tight">{editingId ? 'Edit Resource' : 'Add New Resource'}</h3>
              <button onClick={resetForm} className="text-text-muted hover:text-text-main transition-colors p-1 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Title</label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-card-border bg-app-bg text-text-main rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g., General Studies - I Notes"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ResourceType)}
                    className="w-full px-4 py-3 border border-card-border bg-app-bg text-text-main rounded-xl focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-all"
                  >
                    {Object.values(ResourceType).map(t => (
                      <option key={t} value={t} className="bg-card-bg">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Subject</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value as Subject)}
                    className="w-full px-4 py-3 border border-card-border bg-app-bg text-text-main rounded-xl focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-all"
                  >
                    {Object.values(Subject).map(s => (
                      <option key={s} value={s} className="bg-card-bg">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
                  {newType === ResourceType.PDF || newType === ResourceType.IMAGE ? 'File Upload' : 'URL Link'}
                </label>
                {newType === ResourceType.PDF || newType === ResourceType.IMAGE ? (
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full px-4 py-3 border border-dashed border-card-border bg-app-bg text-text-muted rounded-xl hover:bg-white/5 flex items-center justify-center text-sm transition-all">
                        {selectedFile ? selectedFile.name : 'Click to browse files...'}
                      </div>
                      <input type="file" className="hidden" onChange={handleFileChange} accept={newType === ResourceType.PDF ? ".pdf" : "image/*"} />
                    </label>
                  </div>
                ) : (
                  <input
                    required
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-card-border bg-app-bg text-text-main rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="https://..."
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Publish Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-3 border border-card-border bg-app-bg text-text-main rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-card-border bg-app-bg text-text-main rounded-xl focus:ring-1 focus:ring-blue-500 outline-none h-24 resize-none transition-all"
                  placeholder="Add notes or resource context..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 border border-card-border text-text-muted rounded-xl hover:bg-white/5 font-bold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    editingId ? 'Save Changes' : 'Create Resource'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesView;