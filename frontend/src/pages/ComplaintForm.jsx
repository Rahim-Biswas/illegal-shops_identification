/**
 * Create/Edit complaint page
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { complaintApi } from '../services/api';
import { toast } from 'react-toastify';
import { FiMapPin, FiLoader } from 'react-icons/fi';

const DISASTER_TYPES = ['Landslide', 'Flood', 'Earthquake', 'Fire', 'Storm', 'Other'];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export default function ComplaintForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
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
    if (isEditing) {
      loadComplaint();
    }
  }, [id]);

  const loadComplaint = async () => {
    setIsLoading(true);
    try {
      const response = await complaintApi.getComplaint(id);
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
    } catch (error) {
      toast.error('Failed to load complaint');
      navigate('/complaints');
    } finally {
      setIsLoading(false);
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

    if (!formData.title || !formData.description || !formData.disaster_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
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
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save complaint');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Complaint' : 'Report a Disaster'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing
            ? 'Update your complaint details'
            : 'Provide detailed information about the disaster incident'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Title */}
        <div>
          <label className="form-label">
            Complaint Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="input-field"
            placeholder="Brief title of the incident"
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

        {/* Location Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <FiMapPin className="mr-2" />
            Location Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Latitude</label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                step="0.000001"
                className="input-field"
                placeholder="-90 to 90"
              />
            </div>

            <div>
              <label className="form-label">Longitude</label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                step="0.000001"
                className="input-field"
                placeholder="-180 to 180"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            className="btn-secondary mb-4"
          >
            Get Current Location
          </button>

          <div>
            <label className="form-label">Location Name</label>
            <input
              type="text"
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., Main Street, City Center"
            />
          </div>
        </div>

        {/* Incident Details */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Incident Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Incident Date & Time</label>
              <input
                type="datetime-local"
                name="incident_date"
                value={formData.incident_date}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="form-label">Affected People</label>
              <input
                type="number"
                name="affected_people"
                value={formData.affected_people}
                onChange={handleChange}
                min="0"
                className="input-field"
                placeholder="Number of affected people"
              />
            </div>
          </div>

          <div className="mt-4">
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
        </div>

        {/* Media Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Media Links</h3>

          <div className="grid grid-cols-1 gap-4">
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
        </div>

        {/* Form Actions */}
        <div className="border-t border-gray-200 pt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/complaints')}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex items-center"
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
        </div>
      </form>
    </div>
  );
}
