/**
 * Create/Edit complaint page
 * Supports both static and dynamic forms from KoboToolbox
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { complaintApi, koboApi } from '../services/api';
import { toast } from 'react-toastify';
import { FiMapPin, FiLoader } from 'react-icons/fi';

const DISASTER_TYPES = ['Landslide', 'Flood', 'Earthquake', 'Fire', 'Storm', 'Other'];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export default function ComplaintForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isDynamic, setIsDynamic] = useState(false);
  const [dynamicForm, setDynamicForm] = useState(null);
  const [dynamicData, setDynamicData] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    disaster_type: '',
    severity: '',
    latitude: '',
    longitude: '',
    location_name: '',
    affected_people: '',
    damage_description: '',
    incident_date: '',
    image_url: '',
    video_url: '',
  });

  useEffect(() => {
    checkDynamicForm();
    if (isEditing) {
      loadComplaint();
    }
  }, [id]);

  const checkDynamicForm = async () => {
    // Check if dynamic form is configured (you can set this via env or config)
    const complaintFormUid = import.meta.env.VITE_KOBO_COMPLAINT_FORM_UID;
    if (complaintFormUid) {
      try {
        const response = await koboApi.getFormDefinition(complaintFormUid);
        setDynamicForm(response.data);
        setIsDynamic(true);
      } catch (error) {
        console.warn('Dynamic form not available, using static form');
      }
    }
  };

  const loadComplaint = async () => {
    setIsLoading(true);
    try {
      const response = await complaintApi.getComplaint(id);
      if (isDynamic) {
        // For dynamic, load into dynamicData
        setDynamicData(response.data.dynamic_data || {});
      } else {
        setFormData({
          title: response.data.title,
          description: response.data.description,
          disaster_type: response.data.disaster_type,
          severity: response.data.severity || '',
          latitude: response.data.latitude || '',
          longitude: response.data.longitude || '',
          location_name: response.data.location_name || '',
          affected_people: response.data.affected_people || '',
          damage_description: response.data.damage_description || '',
          incident_date: response.data.incident_date || '',
          image_url: response.data.image_url || '',
          video_url: response.data.video_url || '',
        });
      }
    } catch (error) {
      toast.error('Failed to load complaint');
      navigate('/complaints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDynamicChange = (name, value) => {
    setDynamicData((prev) => ({ ...prev, [name]: value }));
  };

  const renderDynamicQuestion = (question) => {
    const { type, name, label, choices = [] } = question;
    const value = dynamicData[name] || '';

    switch (type) {
      case 'text':
        return (
          <div key={name}>
            <label className="form-label">{label}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleDynamicChange(name, e.target.value)}
              className="input-field"
            />
          </div>
        );
      case 'integer':
        return (
          <div key={name}>
            <label className="form-label">{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleDynamicChange(name, e.target.value)}
              className="input-field"
            />
          </div>
        );
      case 'select_one':
        return (
          <div key={name}>
            <label className="form-label">{label}</label>
            <select
              value={value}
              onChange={(e) => handleDynamicChange(name, e.target.value)}
              className="input-field"
            >
              <option value="">Select...</option>
              {choices.map((choice) => (
                <option key={choice.name} value={choice.name}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
        );
      case 'date':
        return (
          <div key={name}>
            <label className="form-label">{label}</label>
            <input
              type="date"
              value={value}
              onChange={(e) => handleDynamicChange(name, e.target.value)}
              className="input-field"
            />
          </div>
        );
      case 'geopoint':
        return (
          <div key={name}>
            <label className="form-label">{label}</label>
            <button
              type="button"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      handleDynamicChange(name, `${position.coords.latitude} ${position.coords.longitude}`);
                      toast.success('Location captured');
                    },
                    () => toast.error('Failed to get location')
                  );
                }
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <FiMapPin size={16} />
              Get Location
            </button>
            <input
              type="text"
              value={value}
              onChange={(e) => handleDynamicChange(name, e.target.value)}
              className="input-field mt-2"
              placeholder="lat lon"
            />
          </div>
        );
      default:
        return (
          <div key={name}>
            <label className="form-label">{label} ({type})</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleDynamicChange(name, e.target.value)}
              className="input-field"
            />
          </div>
        );
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
          toast.success('Location captured successfully');
        },
        () => {
          toast.error('Failed to get location');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      if (isDynamic) {
        // Submit to Kobo
        const complaintFormUid = import.meta.env.VITE_KOBO_COMPLAINT_FORM_UID;
        await koboApi.submitToForm(complaintFormUid, dynamicData);
        toast.success('Complaint submitted to KoboToolbox');
      } else {
        // Submit to local backend
        if (!formData.title || !formData.description || !formData.disaster_type) {
          toast.error('Please fill in all required fields');
          return;
        }

        if (isEditing) {
          await complaintApi.updateComplaint(id, {
            ...formData,
            affected_people: formData.affected_people ? parseInt(formData.affected_people) : null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          });
          toast.success('Complaint updated successfully');
        } else {
          await complaintApi.createComplaint({
            ...formData,
            affected_people: formData.affected_people ? parseInt(formData.affected_people) : null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          });
          toast.success('Complaint submitted successfully');
        }
        navigate('/complaints');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save complaint');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex justify-center items-center h-96">
        <FiLoader className="animate-spin text-3xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Complaint' : 'Submit Complaint'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isDynamic ? 'Using dynamic form from KoboToolbox' : 'Report a disaster or emergency incident'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isDynamic ? (
          // Dynamic Form
          dynamicForm?.content?.survey?.map(renderDynamicQuestion)
        ) : (
          // Static Form
          <>
            {/* Title */}
            <div>
              <label className="form-label">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="Brief title for the complaint"
              />
            </div>

            {/* Description */}
            <div>
              <label className="form-label">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="input-field"
                placeholder="Detailed description of the incident"
              />
            </div>

            {/* Disaster Type and Severity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Disaster Type *
                </label>
                <select
                  name="disaster_type"
                  value={formData.disaster_type}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select a type</option>
                  {DISASTER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Severity Level</label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select severity</option>
                  {SEVERITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="form-label">Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleChange}
                  className="input-field flex-1"
                  placeholder="Location name or address"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="btn-secondary flex items-center gap-2"
                >
                  <FiMapPin size={16} />
                  GPS
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Latitude"
                />
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Longitude"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Affected People</label>
                <input
                  type="number"
                  name="affected_people"
                  value={formData.affected_people}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Number of people affected"
                />
              </div>

              <div>
                <label className="form-label">Incident Date</label>
                <input
                  type="date"
                  name="incident_date"
                  value={formData.incident_date}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            {/* Damage Description */}
            <div>
              <label className="form-label">Damage Description</label>
              <textarea
                name="damage_description"
                value={formData.damage_description}
                onChange={handleChange}
                rows="3"
                className="input-field"
                placeholder="Describe the damage caused"
              />
            </div>

            {/* Media URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Image URL</label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="form-label">Video URL</label>
                <input
                  type="url"
                  name="video_url"
                  value={formData.video_url}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="https://example.com/video.mp4"
                />
              </div>
            </div>
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <FiLoader className="animate-spin mr-2" size={18} />
              {isEditing ? 'Updating...' : 'Submitting...'}
            </>
          ) : (
            isEditing ? 'Update Complaint' : 'Submit Complaint'
          )}
        </button>
      </form>
    </div>
  );
}