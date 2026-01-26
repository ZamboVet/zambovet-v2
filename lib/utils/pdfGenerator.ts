import jsPDF from "jspdf";

export type VetApplicationData = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  specialization: string | null;
  license_number: string;
  clinic_id: number | null;
  business_permit_url: string | null;
  professional_license_url: string | null;
  government_id_url: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_at: string | null;
};

export type VetProfileData = {
  full_name: string;
  email: string;
  phone: string | null;
  license_number: string | null;
  specialization: string | null;
  verification_status: string;
  is_available: boolean;
  average_rating: number | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  created_at?: string | null;
};

/**
 * Generate PDF for veterinarian application
 */
export function generateVetApplicationPDF(application: VetApplicationData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFillColor(37, 99, 235); // Blue
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Veterinarian Application", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("ZamboVet Platform", pageWidth / 2, 30, { align: "center" });

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // Application ID and Status
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Application ID: ${application.id}`, margin, yPos);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, yPos, { align: "right" });
  
  yPos += 10;
  
  // Status Badge
  const statusColors: Record<string, { bg: [number, number, number]; text: [number, number, number] }> = {
    pending: { bg: [251, 191, 36], text: [120, 53, 15] },
    approved: { bg: [34, 197, 94], text: [255, 255, 255] },
    rejected: { bg: [239, 68, 68], text: [255, 255, 255] },
  };
  
  const statusColor = statusColors[application.status] || statusColors.pending;
  doc.setFillColor(statusColor.bg[0], statusColor.bg[1], statusColor.bg[2]);
  doc.roundedRect(margin, yPos, 40, 8, 2, 2, "F");
  doc.setTextColor(statusColor.text[0], statusColor.text[1], statusColor.text[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(application.status.toUpperCase(), margin + 20, yPos + 5.5, { align: "center" });

  yPos += 20;

  // Section: Personal Information
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Personal Information", margin + 3, yPos + 5.5);
  
  yPos += 15;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const addField = (label: string, value: string | null | undefined) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value || "N/A", margin + 50, yPos);
    yPos += 8;
  };

  addField("Full Name", application.full_name);
  addField("Email", application.email);
  addField("Phone", application.phone);
  addField("License Number", application.license_number);
  addField("Specialization", application.specialization);
  addField("Clinic ID", application.clinic_id?.toString());

  yPos += 5;

  // Section: Application Details
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Application Details", margin + 3, yPos + 5.5);
  
  yPos += 15;
  doc.setFontSize(11);

  addField("Submitted On", application.created_at ? new Date(application.created_at).toLocaleString() : "N/A");
  addField("Status", application.status);
  
  if (application.reviewed_at) {
    addField("Reviewed On", new Date(application.reviewed_at).toLocaleString());
  }
  
  if (application.reviewed_by) {
    addField("Reviewed By", application.reviewed_by);
  }

  yPos += 5;

  // Section: Documents
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Submitted Documents", margin + 3, yPos + 5.5);
  
  yPos += 15;
  doc.setFontSize(11);

  const addDocument = (label: string, url: string | null) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(37, 99, 235);
    if (url) {
      doc.textWithLink(url.length > 60 ? url.substring(0, 60) + "..." : url, margin + 50, yPos, { url });
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text("Not provided", margin + 50, yPos);
    }
    doc.setTextColor(0, 0, 0);
    yPos += 8;
  };

  addDocument("Professional License", application.professional_license_url);
  addDocument("Business Permit", application.business_permit_url);
  addDocument("Government ID", application.government_id_url);

  yPos += 5;

  // Section: Review Notes
  if (application.review_notes || application.rejection_reason) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Review Notes", margin + 3, yPos + 5.5);
    
    yPos += 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const notes = application.review_notes || application.rejection_reason || "";
    const splitNotes = doc.splitTextToSize(notes, pageWidth - 2 * margin - 10);
    doc.text(splitNotes, margin + 5, yPos);
    yPos += splitNotes.length * 6;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("ZamboVet - Veterinary Management Platform", pageWidth / 2, footerY, { align: "center" });
  doc.text("This is a system-generated document", pageWidth / 2, footerY + 5, { align: "center" });

  // Save PDF
  const fileName = `VetApplication_${application.full_name.replace(/\s+/g, "_")}_${application.id}.pdf`;
  doc.save(fileName);
}

/**
 * Generate PDF for veterinarian profile
 */
export function generateVetProfilePDF(profile: VetProfileData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFillColor(16, 185, 129); // Emerald
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Veterinarian Profile", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Professional Credentials", pageWidth / 2, 30, { align: "center" });

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // Generated date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, yPos, { align: "right" });
  
  yPos += 15;

  // Section: Personal Information
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Personal Information", margin + 3, yPos + 5.5);
  
  yPos += 15;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const addField = (label: string, value: string | null | undefined) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value || "N/A", margin + 50, yPos);
    yPos += 8;
  };

  addField("Full Name", profile.full_name);
  addField("Email", profile.email);
  addField("Phone", profile.phone);
  addField("License Number", profile.license_number);
  addField("Specialization", profile.specialization);

  yPos += 5;

  // Section: Professional Status
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Professional Status", margin + 3, yPos + 5.5);
  
  yPos += 15;
  doc.setFontSize(11);

  addField("Verification Status", profile.verification_status);
  addField("Availability", profile.is_available ? "Available" : "Not Available");
  addField("Average Rating", profile.average_rating ? `${profile.average_rating.toFixed(2)} / 5.0` : "No ratings yet");

  yPos += 5;

  // Section: Clinic Information
  if (profile.clinic_name || profile.clinic_address) {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Clinic Information", margin + 3, yPos + 5.5);
    
    yPos += 15;
    doc.setFontSize(11);

    addField("Clinic Name", profile.clinic_name);
    addField("Clinic Address", profile.clinic_address);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("ZamboVet - Veterinary Management Platform", pageWidth / 2, footerY, { align: "center" });
  doc.text("This is a system-generated document", pageWidth / 2, footerY + 5, { align: "center" });

  // Save PDF
  const fileName = `VetProfile_${profile.full_name.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
