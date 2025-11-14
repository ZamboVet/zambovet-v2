"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";

interface ReviewModalProps {
  appointmentId: number;
  veterinarianId: number | null;
  clinicId: number | null;
  petOwnerId: number | null;
  onSuccess?: () => void;
}

export default function ReviewModal({
  appointmentId,
  veterinarianId,
  clinicId,
  petOwnerId,
  onSuccess,
}: ReviewModalProps) {
  const [loading, setLoading] = useState(false);

  const renderStarButtons = (name: string, selectedRating: number) => {
    return [1, 2, 3, 4, 5]
      .map((i) => {
        const isSelected = i <= selectedRating;
        return `
        <button type="button" class="star-btn" data-group="${name}" data-value="${i}" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:12px;border:2px solid ${isSelected ? '#f59e0b' : '#e5e7eb'};background:${isSelected ? '#fef3c7' : '#ffffff'};transition:all 0.25s ease;box-shadow:${isSelected ? '0 4px 12px rgba(245, 158, 11, 0.25)' : '0 2px 4px rgba(0,0,0,0.08)'};">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transition: all 0.25s ease;">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="${isSelected ? '#f59e0b' : '#d1d5db'}" stroke="${isSelected ? '#d97706' : '#9ca3af'}" stroke-width="0.5"/>
          </svg>
        </button>
      `;
      })
      .join("");
  };

  const handleSubmit = async () => {
    const { value: formData, isConfirmed } = await Swal.fire<{
      rating: string;
      title: string;
      comment: string;
      serviceRating: string;
    }>({
      title: "<div style='font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #2563eb, #1d4ed8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; letter-spacing: -0.025em;'>Share Your Feedback</div>",
      width: 600,
      padding: '0',
      background: '#ffffff',
      html: `
        <div style="text-align: left; display: grid; gap: 28px; font-family: 'Poppins', ui-sans-serif; padding: 24px; max-width: 550px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fed7aa 100%); padding: 24px; border-radius: 20px; border: 2px solid #f59e0b; box-shadow: 0 8px 25px rgba(245, 158, 11, 0.15);">
            <label style="display: block; font-size: 17px; color: #92400e; margin-bottom: 16px; font-weight: 800; text-align: center; letter-spacing: -0.025em;">
              How was your overall experience? <span style="color: #dc2626; font-size: 16px;">*</span>
            </label>
            <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 16px;">
              ${renderStarButtons('rating', 4)}
            </div>
            <input type="hidden" id="rating_input" value="4" />
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; text-align: center; margin-top: 8px;">
              <span style="font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Poor</span>
              <span style="font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Fair</span>
              <span style="font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Good</span>
              <span style="font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Great</span>
              <span style="font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Amazing</span>
            </div>
          </div>

          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px; border-radius: 20px; border: 2px solid #cbd5e1; box-shadow: 0 4px 12px rgba(71, 85, 105, 0.1);">
            <label style="display: block; font-size: 16px; color: #1e293b; margin-bottom: 14px; font-weight: 800; letter-spacing: -0.025em;">
              Review Title <span style="color: #dc2626; font-size: 15px;">*</span>
            </label>
            <input
              id="review_title"
              type="text"
              placeholder="e.g., Outstanding care and professional service"
              style="
                width: 100%;
                padding: 16px 18px;
                border: 2px solid #cbd5e1;
                border-radius: 14px;
                font-family: 'Poppins', ui-sans-serif;
                font-size: 15px;
                color: #1e293b;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-sizing: border-box;
                background: #ffffff;
                box-shadow: 0 2px 8px rgba(71, 85, 105, 0.08);
                font-weight: 500;
              "
              onfocus="
                this.style.borderColor='#3b82f6';
                this.style.boxShadow='0 0 0 4px rgba(59, 130, 246, 0.1), 0 8px 25px rgba(59, 130, 246, 0.15)';
                this.style.transform='translateY(-2px)';
              "
              onblur="
                this.style.borderColor='#cbd5e1';
                this.style.boxShadow='0 2px 8px rgba(71, 85, 105, 0.08)';
                this.style.transform='translateY(0)';
              "
            />
          </div>

          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 24px; border-radius: 20px; border: 2px solid #7dd3fc; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);">
            <label style="display: block; font-size: 16px; color: #0c4a6e; margin-bottom: 14px; font-weight: 800; letter-spacing: -0.025em;">
              Your Detailed Review <span style="color: #dc2626; font-size: 15px;">*</span>
            </label>
            <textarea
              id="review_comment"
              placeholder="Tell us about your experience! What went well? How was the staff? Would you recommend this veterinarian to other pet owners?"
              style="
                width: 100%;
                padding: 18px;
                border: 2px solid #7dd3fc;
                border-radius: 14px;
                font-family: 'Poppins', ui-sans-serif;
                font-size: 15px;
                color: #0c4a6e;
                height: 130px;
                resize: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-sizing: border-box;
                background: #ffffff;
                box-shadow: 0 2px 8px rgba(14, 165, 233, 0.08);
                line-height: 1.6;
                font-weight: 500;
              "
              onfocus="
                this.style.borderColor='#0ea5e9';
                this.style.boxShadow='0 0 0 4px rgba(14, 165, 233, 0.1), 0 8px 25px rgba(14, 165, 233, 0.15)';
                this.style.transform='translateY(-2px)';
              "
              onblur="
                this.style.borderColor='#7dd3fc';
                this.style.boxShadow='0 2px 8px rgba(14, 165, 233, 0.08)';
                this.style.transform='translateY(0)';
              "
            ></textarea>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
              <span style="font-size: 13px; color: #0369a1; font-weight: 600; letter-spacing: -0.025em;">Your honest feedback helps other pet owners</span>
              <span id="char_count" style="font-size: 13px; color: #0369a1; font-weight: 700; background: #ffffff; padding: 6px 10px; border-radius: 10px; border: 2px solid #bae6fd; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.1);">0/500</span>
            </div>
          </div>

          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%); padding: 24px; border-radius: 20px; border: 2px solid #34d399; box-shadow: 0 4px 12px rgba(52, 211, 153, 0.15);">
            <label style="display: block; font-size: 16px; color: #065f46; margin-bottom: 16px; font-weight: 800; text-align: center; letter-spacing: -0.025em;">
              Service Quality Rating <span style="color: #64748b; font-weight: 600; font-size: 14px;">(Optional)</span>
            </label>
            <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 16px;">
              ${renderStarButtons('serviceRating', 4)}
            </div>
            <input type="hidden" id="serviceRating_input" value="4" />
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; text-align: center; margin-top: 8px;">
              <span style="font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Poor</span>
              <span style="font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Fair</span>
              <span style="font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Good</span>
              <span style="font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Great</span>
              <span style="font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">Perfect</span>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Submit Review",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d1d5db",
      buttonsStyling: true,
      showConfirmButton: true,
      didOpen: () => {
        const textarea = document.getElementById('review_comment') as HTMLTextAreaElement;
        const charCount = document.getElementById('char_count') as HTMLElement;
        if (textarea && charCount) {
          textarea.addEventListener('input', () => {
            charCount.textContent = `${textarea.value.length}/500`;
          });
        }

        const setupGroup = (group: string, inputId: string) => {
          const buttons = Array.from(document.querySelectorAll(`button.star-btn[data-group="${group}"]`)) as HTMLButtonElement[];
          const hidden = document.getElementById(inputId) as HTMLInputElement;
          const apply = (val: number) => {
            hidden.value = String(val);
            buttons.forEach((btn) => {
              const v = parseInt(btn.dataset.value || '0');
              const selected = v <= val;
              btn.style.borderColor = selected ? '#f59e0b' : '#e5e7eb';
              btn.style.background = selected ? '#fef3c7' : '#ffffff';
              btn.style.boxShadow = selected ? '0 4px 12px rgba(245, 158, 11, 0.25)' : '0 2px 4px rgba(0,0,0,0.08)';
              const path = btn.querySelector('path');
              if (path) {
                path.setAttribute('fill', selected ? '#f59e0b' : '#d1d5db');
                path.setAttribute('stroke', selected ? '#d97706' : '#9ca3af');
              }
            });
          };
          buttons.forEach((btn) => {
            const v = parseInt(btn.dataset.value || '0');
            btn.addEventListener('mouseenter', () => apply(v));
            btn.addEventListener('mouseleave', () => apply(parseInt(hidden.value || '0')));
            btn.addEventListener('click', () => apply(v));
          });
          apply(parseInt(hidden.value || '0'));
        };
        setupGroup('rating', 'rating_input');
        setupGroup('serviceRating', 'serviceRating_input');
      },
      preConfirm: () => {
        const rating = (document.getElementById('rating_input') as HTMLInputElement)?.value;
        const title = (document.getElementById("review_title") as HTMLInputElement)?.value;
        const comment = (document.getElementById("review_comment") as HTMLTextAreaElement)?.value;
        const serviceRating = (document.getElementById('serviceRating_input') as HTMLInputElement)?.value;

        if (!rating) {
          Swal.showValidationMessage("Please select an overall rating");
          return;
        }
        if (!title?.trim()) {
          Swal.showValidationMessage("Please enter a title");
          return;
        }
        if (!comment?.trim()) {
          Swal.showValidationMessage("Please enter a comment");
          return;
        }

        return { rating, title, comment, serviceRating } as any;
      },
    });

    if (!isConfirmed || !formData) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        appointment_id: appointmentId,
        pet_owner_id: petOwnerId,
        veterinarian_id: veterinarianId,
        clinic_id: clinicId,
        rating: parseInt(formData.rating, 10),
        title: formData.title,
        comment: formData.comment,
        service_rating: formData.serviceRating ? parseInt(formData.serviceRating, 10) : null,
        is_approved: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      await Swal.fire({
        icon: "success",
        title: "Review Submitted",
        text: "Thank you for your feedback! Your review is pending approval.",
        confirmButtonColor: "#2563eb",
      });

      onSuccess?.();
    } catch (err: any) {
      await Swal.fire({
        icon: "error",
        title: "Failed to submit review",
        text: err?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={loading}
      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 hover:to-orange-100 ring-1 ring-amber-200 hover:ring-amber-300 text-[11px] sm:text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
      title="Share your feedback about this appointment"
    >
      {loading ? (
        <>
          <span className="inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-amber-400 border-t-amber-700 rounded-full animate-spin" />
          <span>Submitting...</span>
        </>
      ) : (
        <>
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex-shrink-0" />
          <span className="hidden sm:inline">Add Review</span>
          <span className="sm:hidden">Review</span>
        </>
      )}
    </button>
  );
}
