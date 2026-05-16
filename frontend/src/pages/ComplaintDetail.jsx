/**
 * Shop violation report detail page
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { complaintApi, commentApi } from '../services/api';
import { formatDateTime, getStatusColor, getSeverityColor } from '../utils/helpers';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiEdit2, FiLoader, FiSend } from 'react-icons/fi';

export default function ComplaintDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [complaintRes, commentsRes] = await Promise.all([
        complaintApi.getComplaint(id),
        commentApi.getComments(id),
      ]);
      setComplaint(complaintRes.data);
      setComments(commentsRes.data);
    } catch (error) {
      toast.error('Failed to load report details');
      navigate('/complaints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmittingComment(true);
    try {
      await commentApi.addComment(id, { comment_text: newComment });
      setNewComment('');
      toast.success('Comment added successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <FiLoader className="animate-spin text-3xl text-blue-600" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Report not found</p>
        <button onClick={() => navigate('/complaints')} className="btn-primary">
          Back to Reports
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/complaints')}
          className="flex items-center text-blue-600 hover:text-blue-700"
        >
          <FiArrowLeft size={20} className="mr-2" />
          Back to Reports
        </button>
        <button
          onClick={() => navigate(`/complaints/${id}/edit`)}
          className="btn-primary flex items-center"
        >
          <FiEdit2 size={18} className="mr-2" />
          Edit
        </button>
      </div>

      {/* Main Details */}
      <div className="card space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{complaint.title}</h1>
          <div className="flex items-center gap-4 mt-4">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(complaint.status)}`}>
              {complaint.status.replace('_', ' ').toUpperCase()}
            </span>
            {complaint.severity && (
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getSeverityColor(complaint.severity)}`}>
                {complaint.severity}
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{complaint.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-200 pt-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Shop / Violation Type:</dt>
                <dd className="font-medium">{complaint.disaster_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Submitted:</dt>
                <dd className="font-medium">{formatDateTime(complaint.created_at)}</dd>
              </div>
              {complaint.incident_date && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Incident Date:</dt>
                  <dd className="font-medium">{formatDateTime(complaint.incident_date)}</dd>
                </div>
              )}
              {complaint.affected_people && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Affected People:</dt>
                  <dd className="font-medium">{complaint.affected_people}</dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
            <dl className="space-y-2 text-sm">
              {complaint.location_name && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Location Name:</dt>
                  <dd className="font-medium">{complaint.location_name}</dd>
                </div>
              )}
              {complaint.latitude && complaint.longitude && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Coordinates:</dt>
                    <dd className="font-medium">
                      {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                    </dd>
                  </div>
                  <button
                    onClick={() => navigate(`/map?lat=${complaint.latitude}&lng=${complaint.longitude}`)}
                    className="text-blue-600 hover:underline mt-2"
                  >
                    View on Map
                  </button>
                </>
              )}
            </dl>
          </div>
        </div>

        {complaint.damage_description && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Evidence / Damage Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{complaint.damage_description}</p>
          </div>
        )}

        {(complaint.image_url || complaint.video_url) && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Media</h3>
            <div className="space-y-3">
              {complaint.image_url && (
                <div>
                  <a
                    href={complaint.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Image
                  </a>
                </div>
              )}
              {complaint.video_url && (
                <div>
                  <a
                    href={complaint.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Video
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {complaint.admin_notes && (
          <div className="border-t border-gray-200 pt-4 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Admin Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{complaint.admin_notes}</p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Comments & Updates</h2>

        {/* Add Comment Form */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment or update..."
              rows="3"
              className="input-field flex-1"
            />
            <button
              onClick={handleAddComment}
              disabled={isSubmittingComment}
              className="btn-primary flex items-center self-start"
            >
              {isSubmittingComment ? (
                <FiLoader className="animate-spin" size={18} />
              ) : (
                <>
                  <FiSend size={18} className="mr-2" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {comment.is_admin_comment && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs mr-2">
                          ADMIN
                        </span>
                      )}
                      Comment
                    </p>
                    <p className="text-sm text-gray-500">{formatDateTime(comment.created_at)}</p>
                  </div>
                </div>
                <p className="text-gray-600 whitespace-pre-wrap">{comment.comment_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
