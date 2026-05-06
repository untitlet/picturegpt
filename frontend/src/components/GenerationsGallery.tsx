import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { generationsApi } from '../api';
import type { GenerationJob } from '../types';

const statusColors = {
  queued: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function GenerationsGallery() {
  const { generations, loadingGenerations, pagination, loadGenerations } = useAppStore();
  const [selectedJob, setSelectedJob] = React.useState<GenerationJob | null>(null);
  const [editPrompt, setEditPrompt] = React.useState('');

  useEffect(() => {
    loadGenerations();
    
    // Poll for updates on processing jobs
    const interval = setInterval(() => {
      const hasProcessing = generations.some(g => g.status === 'processing' || g.status === 'queued');
      if (hasProcessing) {
        loadGenerations(pagination.page);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleEdit = async (job: GenerationJob) => {
    if (!editPrompt.trim()) return;
    
    try {
      await generationsApi.edit(job.id, editPrompt, job.model);
      setEditPrompt('');
      setSelectedJob(null);
      loadGenerations(pagination.page);
    } catch (error) {
      console.error('Failed to edit generation:', error);
    }
  };

  if (loadingGenerations && generations.length === 0) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Generated Images</h2>
      
      {generations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No generations yet. Create your first image!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {generations.map((job) => (
              <div
                key={job.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedJob(job)}
              >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {job.outputImageUrls?.[0] ? (
                    <img
                      src={job.outputImageUrls[0]}
                      alt={job.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">🎨</span>
                    </div>
                  )}
                </div>
                
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[job.status]}`}>
                    {job.status}
                  </span>
                </div>
                
                {job.status === 'completed' && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium">
                      View
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => loadGenerations(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => loadGenerations(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Generation Details</h3>
                <button
                  onClick={() => { setSelectedJob(null); setEditPrompt(''); }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  {selectedJob.outputImageUrls?.[0] ? (
                    <img
                      src={selectedJob.outputImageUrls[0]}
                      alt={selectedJob.prompt}
                      className="w-full rounded-lg"
                    />
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-6xl">⏳</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-block mt-1 px-2 py-1 text-sm rounded-full ${statusColors[selectedJob.status]}`}>
                      {selectedJob.status}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prompt</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedJob.prompt}</p>
                  </div>

                  {selectedJob.negativePrompt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Negative Prompt</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedJob.negativePrompt}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Size</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedJob.width}x{selectedJob.height}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quality</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedJob.quality}/10</p>
                    </div>
                  </div>

                  {selectedJob.status === 'completed' && (
                    <div className="pt-4 border-t">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Edit Image
                      </label>
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Enter new prompt for editing..."
                        className="w-full border rounded-lg p-2 text-sm"
                        rows={3}
                      />
                      <button
                        onClick={() => handleEdit(selectedJob)}
                        disabled={!editPrompt.trim()}
                        className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                      >
                        Apply Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
