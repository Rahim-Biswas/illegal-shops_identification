/**
 * Form Builder — Full CRUD manager for KoboToolbox forms
 * - List all forms from KoboToolbox
 * - Create new forms with question builder
 * - Edit existing form questions
 * - Delete forms
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { koboApi } from '../services/api';
import { useAuthStore } from '../store/store';
import { toast } from 'react-toastify';
import {
  FiPlus, FiTrash2, FiSave, FiArrowLeft, FiEdit2,
  FiRefreshCw, FiLoader, FiFileText, FiChevronRight,
  FiX, FiCheck, FiAlertCircle, FiDatabase,
} from 'react-icons/fi';

const QUESTION_TYPES = [
  { value: 'text',              label: 'Short Text' },
  { value: 'textarea',          label: 'Long Text' },
  { value: 'integer',           label: 'Number (Integer)' },
  { value: 'decimal',           label: 'Number (Decimal)' },
  { value: 'select_one',        label: 'Single Choice' },
  { value: 'select_multiple',   label: 'Multiple Choice' },
  { value: 'date',              label: 'Date' },
  { value: 'time',              label: 'Time' },
  { value: 'datetime',          label: 'Date & Time' },
  { value: 'geopoint',          label: 'GPS Location' },
  { value: 'image',             label: 'Photo' },
  { value: 'audio',             label: 'Audio' },
  { value: 'file',              label: 'File Upload' },
  { value: 'note',              label: 'Note / Label' },
  { value: 'calculate',         label: 'Calculate' },
  { value: 'range',             label: 'Range / Slider' },
  { value: 'barcode',           label: 'Barcode / QR' },
];

const STATUS_COLORS = {
  deployed:    'bg-green-100 text-green-700 border-green-200',
  draft:       'bg-yellow-100 text-yellow-700 border-yellow-200',
  archived:    'bg-gray-100 text-gray-500 border-gray-200',
};

// ─────────────────────────────────────────────────────────────
//  Question editor row
// ─────────────────────────────────────────────────────────────
function QuestionRow({ question, index, onUpdate, onRemove, onAddChoice, onUpdateChoice, onRemoveChoice }) {
  const needsChoices = ['select_one', 'select_multiple'].includes(question.type);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Question {index + 1}</span>
        <button onClick={() => onRemove(index)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <FiTrash2 size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Field Name *</label>
          <input
            type="text"
            value={question.name}
            onChange={e => onUpdate(index, 'name', e.target.value)}
            placeholder="e.g. reporter_name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
          <input
            type="text"
            value={question.label}
            onChange={e => onUpdate(index, 'label', e.target.value)}
            placeholder="What is your full name?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
          <select
            value={question.type}
            onChange={e => onUpdate(index, 'type', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={question.required}
            onChange={e => onUpdate(index, 'required', e.target.checked)}
            className="rounded"
          />
          Required
        </label>
        <div className="flex-1">
          <input
            type="text"
            value={question.hint || ''}
            onChange={e => onUpdate(index, 'hint', e.target.value)}
            placeholder="Hint text (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>
      </div>

      {needsChoices && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Answer Choices</span>
            <button
              onClick={() => onAddChoice(index)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <FiPlus size={12} /> Add Choice
            </button>
          </div>
          {question.choices.map((choice, ci) => (
            <div key={ci} className="flex gap-2 mb-2">
              <input
                type="text"
                value={choice.name}
                onChange={e => onUpdateChoice(index, ci, 'name', e.target.value)}
                placeholder="value"
                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              <input
                type="text"
                value={choice.label}
                onChange={e => onUpdateChoice(index, ci, 'label', e.target.value)}
                placeholder="Display Label"
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              <button onClick={() => onRemoveChoice(index, ci)} className="text-red-400 hover:text-red-600">
                <FiX size={14} />
              </button>
            </div>
          ))}
          {question.choices.length === 0 && (
            <p className="text-xs text-gray-400 italic">No choices yet — click "Add Choice"</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Form editor (create or edit)
// ─────────────────────────────────────────────────────────────
function FormEditor({ editingForm, onSave, onCancel }) {
  const [formName, setFormName] = useState(editingForm?.name || '');
  const [questions, setQuestions] = useState(() => {
    if (!editingForm) return [];
    try {
      const survey = editingForm.content?.survey || [];
      return survey.map(q => ({
        name: q.name || '',
        label: Array.isArray(q.label) ? q.label[0] : (q.label || ''),
        type: q.type || 'text',
        required: q.required === 'true' || q.required === true,
        hint: Array.isArray(q.hint) ? q.hint[0] : (q.hint || ''),
        choices: (q.select_from_list_name ? [] : (q.choices || [])).map(c => ({
          name: c.name || '',
          label: Array.isArray(c.label) ? c.label[0] : (c.label || ''),
        })),
      }));
    } catch { return []; }
  });
  const [isSaving, setIsSaving] = useState(false);

  const addQuestion = () => setQuestions(prev => [...prev, { name: '', label: '', type: 'text', required: false, hint: '', choices: [] }]);

  const updateQuestion = (i, field, value) => {
    setQuestions(prev => { const a = [...prev]; a[i] = { ...a[i], [field]: value }; return a; });
  };

  const removeQuestion = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i));

  const addChoice = (qi) => {
    setQuestions(prev => {
      const a = [...prev];
      a[qi] = { ...a[qi], choices: [...a[qi].choices, { name: '', label: '' }] };
      return a;
    });
  };

  const updateChoice = (qi, ci, field, value) => {
    setQuestions(prev => {
      const a = [...prev];
      const choices = [...a[qi].choices];
      choices[ci] = { ...choices[ci], [field]: value };
      a[qi] = { ...a[qi], choices };
      return a;
    });
  };

  const removeChoice = (qi, ci) => {
    setQuestions(prev => {
      const a = [...prev];
      a[qi] = { ...a[qi], choices: a[qi].choices.filter((_, i) => i !== ci) };
      return a;
    });
  };

  const buildContent = () => ({
    survey: questions.map(q => ({
      type: q.type,
      name: q.name,
      label: { 'English (en)': q.label },
      required: q.required,
      ...(q.hint ? { hint: { 'English (en)': q.hint } } : {}),
      ...(q.choices.length > 0 ? { choices: q.choices.map(c => ({ name: c.name, label: { 'English (en)': c.label } })) } : {}),
    })),
    settings: {
      form_title: formName,
      id_string: formName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    },
  });

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Form name is required'); return; }
    if (questions.length === 0) { toast.error('Add at least one question'); return; }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].name.trim() || !questions[i].label.trim()) {
        toast.error(`Question ${i + 1}: name and label are required`); return;
      }
      if (['select_one', 'select_multiple'].includes(questions[i].type) && questions[i].choices.length === 0) {
        toast.error(`Question ${i + 1}: add at least one choice`); return;
      }
    }
    setIsSaving(true);
    try {
      await onSave({ name: formName, content: buildContent(), uid: editingForm?.uid });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
          <FiArrowLeft size={18} /> Back to Forms
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {editingForm ? `Edit: ${editingForm.name}` : 'Create New Form'}
        </h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Form Name *</label>
        <input
          type="text"
          value={formName}
          onChange={e => setFormName(e.target.value)}
          placeholder="e.g. Illegal Shop Survey 2024"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">Questions ({questions.length})</h3>
        <button
          onClick={addQuestion}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <FiPlus size={15} /> Add Question
        </button>
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <FiFileText size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No questions yet. Click "Add Question" to start building.</p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionRow
            key={i}
            question={q}
            index={i}
            onUpdate={updateQuestion}
            onRemove={removeQuestion}
            onAddChoice={addChoice}
            onUpdateChoice={updateChoice}
            onRemoveChoice={removeChoice}
          />
        ))}
      </div>

      {questions.length > 0 && (
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {isSaving ? <FiLoader size={15} className="animate-spin" /> : <FiSave size={15} />}
            {isSaving ? 'Saving...' : editingForm ? 'Update Form' : 'Create in KoboToolbox'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main page — form list
// ─────────────────────────────────────────────────────────────
export default function FormBuilder() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingForm, setEditingForm] = useState(null);
  const [deletingUid, setDeletingUid] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      navigate('/dashboard');
      return;
    }
    loadForms();
  }, [user]);

  const loadForms = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await koboApi.getForms();
      setForms(res.data.forms || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load forms from KoboToolbox');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = async (form) => {
    try {
      const res = await koboApi.getFormDefinition(form.uid);
      setEditingForm(res.data);
      setView('edit');
    } catch {
      toast.error('Failed to load form details');
    }
  };

  const handleSave = async ({ name, content, uid }) => {
    try {
      if (uid) {
        await koboApi.updateForm(uid, { name, content });
        toast.success('Form updated in KoboToolbox!');
      } else {
        await koboApi.createForm({ name, content });
        toast.success('Form created in KoboToolbox!');
      }
      setView('list');
      setEditingForm(null);
      loadForms();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save form');
      throw err;
    }
  };

  const handleDelete = async (uid, name) => {
    if (!window.confirm(`Permanently delete "${name}" from KoboToolbox? This cannot be undone.`)) return;
    setDeletingUid(uid);
    try {
      await koboApi.deleteForm(uid);
      toast.success(`Form "${name}" deleted`);
      loadForms();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete form');
    } finally {
      setDeletingUid(null);
    }
  };

  if (view === 'create') {
    return (
      <div className="max-w-4xl mx-auto">
        <FormEditor editingForm={null} onSave={handleSave} onCancel={() => setView('list')} />
      </div>
    );
  }

  if (view === 'edit' && editingForm) {
    return (
      <div className="max-w-4xl mx-auto">
        <FormEditor editingForm={editingForm} onSave={handleSave} onCancel={() => { setView('list'); setEditingForm(null); }} />
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
          <p className="text-gray-500 text-sm mt-1">Manage KoboToolbox survey forms — create, edit, and delete</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadForms}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow"
          >
            <FiPlus size={15} /> New Form
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <FiAlertCircle size={18} className="flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Could not load KoboToolbox forms</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button onClick={loadForms} className="ml-auto text-xs font-medium underline">Retry</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <FiLoader className="animate-spin text-blue-500" size={28} />
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && forms.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <FiDatabase size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No forms found in KoboToolbox</p>
          <p className="text-gray-400 text-sm mt-1">Create your first form to get started</p>
          <button
            onClick={() => setView('create')}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <FiPlus size={15} /> Create First Form
          </button>
        </div>
      )}

      {/* Forms Grid */}
      {!isLoading && forms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map(form => (
            <div key={form.uid} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {/* Form header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{form.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{form.uid}</p>
                </div>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${STATUS_COLORS[form.deployment_status] || STATUS_COLORS.draft}`}>
                  {form.deployment_status || 'draft'}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">Submissions</p>
                  <p className="text-lg font-bold text-gray-800">{form.submission_count ?? 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">Owner</p>
                  <p className="text-sm font-medium text-gray-700 truncate">{form.owner || '—'}</p>
                </div>
              </div>

              {form.last_submission && (
                <p className="text-xs text-gray-400 mb-3">
                  Last submission: {new Date(form.last_submission).toLocaleDateString()}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => handleOpenEdit(form)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-colors font-medium"
                >
                  <FiEdit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(form.uid, form.name)}
                  disabled={deletingUid === form.uid}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {deletingUid === form.uid ? <FiLoader size={14} className="animate-spin" /> : <FiTrash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}