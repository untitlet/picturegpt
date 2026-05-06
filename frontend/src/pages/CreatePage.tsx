import React from 'react';
import { GenerationForm } from './components/GenerationForm';
import { GenerationsGallery } from './components/GenerationsGallery';

export function CreatePage() {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left Panel - Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6 sticky top-6">
          <h2 className="text-xl font-semibold mb-4">Create Image</h2>
          <GenerationForm />
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-6">
          <GenerationsGallery />
        </div>
      </div>
    </div>
  );
}
