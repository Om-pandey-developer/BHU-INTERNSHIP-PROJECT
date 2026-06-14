/* ============================================================
   BHU Email PDF Generator — Script
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM References ---
    const form = document.getElementById('application-form');
    const generateBtn = document.getElementById('generateBtn');
    const previewBtn = document.getElementById('previewBtn');
    const previewModal = document.getElementById('previewModal');
    const previewModalBody = document.getElementById('previewModalBody');
    const closePreview = document.getElementById('closePreview');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const downloadFromPreview = document.getElementById('downloadFromPreview');
    const photoUploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    const photoPreview = document.getElementById('photoPreview');
    const photoPreviewImg = document.getElementById('photoPreviewImg');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    let uploadedPhotoDataUrl = null;

    // --- Category → Quota mapping ---
    const categoryConfig = {
        'Teaching Staff': { quotaLabel: 'Faculty', quotaValue: '20GB' },
        'Group-A Officer': { quotaLabel: 'Group-A Officer', quotaValue: '20GB' },
        'Non-Teaching Staff': { quotaLabel: 'Non-Teaching Staff', quotaValue: '5GB' },
        'PhD/PG Student': { quotaLabel: 'Research Scholar/PG Student', quotaValue: '10GB' },
    };

    // --- Photo Upload ---
    photoUploadArea.addEventListener('click', () => photoInput.click());

    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('Photo must be under 2MB', true);
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            uploadedPhotoDataUrl = ev.target.result;
            photoPreviewImg.src = uploadedPhotoDataUrl;
            photoPlaceholder.style.display = 'none';
            photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    removePhotoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadedPhotoDataUrl = null;
        photoInput.value = '';
        photoPreviewImg.src = '';
        photoPreview.style.display = 'none';
        photoPlaceholder.style.display = 'flex';
    });

    // --- Collect Form Data ---
    function getFormData() {
        return {
            category: document.getElementById('staffCategory').value,
            name: document.getElementById('applicantName').value.trim(),
            designation: document.getElementById('designation').value.trim(),
            department: document.getElementById('department').value.trim(),
            dateOfAppointment: formatDate(document.getElementById('dateOfAppointment').value),
            faculty: document.getElementById('faculty').value.trim(),
            employeeId: document.getElementById('employeeId').value.trim(),
            dob: formatDate(document.getElementById('dob').value),
            typeOfEmployment: document.getElementById('typeOfEmployment').value,
            nationality: document.getElementById('nationality').value.trim(),
            dateOfRetirement: formatDate(document.getElementById('dateOfRetirement').value),
            emailChoice1: document.getElementById('emailChoice1').value.trim(),
            emailChoice2: document.getElementById('emailChoice2').value.trim(),
            emailChoice3: document.getElementById('emailChoice3').value.trim(),
            mobileNo: document.getElementById('mobileNo').value.trim(),
            alternateEmail: document.getElementById('alternateEmail').value.trim().toUpperCase(),
        };
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    // --- Inject Data into PDF Template ---
    function injectDataIntoTemplate(data) {
        // Category title
        document.getElementById('pdfCategory').textContent = data.category;

        // Main fields
        document.getElementById('pdfName').textContent = data.name;
        document.getElementById('pdfDesignation').textContent = data.designation;
        document.getElementById('pdfDepartment').textContent = data.department;
        document.getElementById('pdfDateOfAppointment').textContent = data.dateOfAppointment;
        document.getElementById('pdfFaculty').textContent = data.faculty;
        document.getElementById('pdfEmployeeId').textContent = data.employeeId;
        document.getElementById('pdfDob').textContent = data.dob;
        document.getElementById('pdfEmploymentType').textContent = data.typeOfEmployment;
        document.getElementById('pdfNationality').textContent = data.nationality;
        document.getElementById('pdfRetirement').textContent = data.dateOfRetirement;

        // Email choices
        document.getElementById('pdfEmail1').textContent = data.emailChoice1;
        document.getElementById('pdfEmail2').textContent = data.emailChoice2;
        document.getElementById('pdfEmail3').textContent = data.emailChoice3;

        // Contact
        document.getElementById('pdfMobile').textContent = data.mobileNo;
        document.getElementById('pdfAlternateEmail').textContent = data.alternateEmail;

        // Quota
        const config = categoryConfig[data.category] || { quotaLabel: 'Faculty', quotaValue: '20GB' };
        document.getElementById('pdfQuotaLabel').textContent = config.quotaLabel;
        document.getElementById('pdfQuotaValue').textContent = config.quotaValue;

        // Declaration
        document.getElementById('pdfDeclName').textContent = data.name || '________________________';
        document.getElementById('pdfDeclDept').textContent = data.department || '________________________';
        document.getElementById('pdfDeclDesignation').textContent = data.designation || '________________________';

        // Photo
        const pdfPhoto = document.getElementById('pdfPhoto');
        const photoLabel = document.querySelector('.pdf-photo-label');
        const photoHint = document.querySelector('.pdf-photo-hint');

        if (uploadedPhotoDataUrl) {
            pdfPhoto.src = uploadedPhotoDataUrl;
            pdfPhoto.style.display = 'block';
            photoLabel.style.display = 'none';
            photoHint.style.display = 'none';
        } else {
            pdfPhoto.style.display = 'none';
            pdfPhoto.src = '';
            photoLabel.style.display = 'block';
            photoHint.style.display = 'block';
        }
    }

    // --- Generate PDF ---
    async function generatePDF() {
        const data = getFormData();
        injectDataIntoTemplate(data);

        const element = document.getElementById('pdf-template');

        // Temporarily make visible for rendering
        const wrapper = document.getElementById('pdf-template-wrapper');
        wrapper.style.position = 'fixed';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.zIndex = '-1';
        wrapper.style.opacity = '0';

        const fileName = `BHU_Email_Application_${data.name.replace(/\s+/g, '_') || 'Form'}.pdf`;

        const opt = {
            margin: [10, 10, 10, 10],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 3,
                useCORS: true,
                logging: false,
                letterRendering: true,
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        };

        try {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="material-symbols-rounded spin">sync</span> Generating...';

            await html2pdf().set(opt).from(element).save();

            showToast('PDF Generated Successfully!');
        } catch (err) {
            console.error('PDF generation error:', err);
            showToast('Failed to generate PDF. Try again.', true);
        } finally {
            // Hide again
            wrapper.style.position = 'absolute';
            wrapper.style.left = '-9999px';
            wrapper.style.opacity = '';
            wrapper.style.zIndex = '';

            generateBtn.disabled = false;
            generateBtn.innerHTML = '<span class="material-symbols-rounded">picture_as_pdf</span> Generate PDF';
        }
    }

    // --- Preview ---
    function showPreview() {
        const data = getFormData();
        injectDataIntoTemplate(data);

        // Clone the template into modal
        const template = document.getElementById('pdf-template');
        previewModalBody.innerHTML = '';
        const clone = template.cloneNode(true);
        clone.style.transform = 'scale(0.75)';
        clone.style.transformOrigin = 'top center';
        clone.id = 'pdf-template-preview-clone';
        previewModalBody.appendChild(clone);

        previewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hidePreview() {
        previewModal.style.display = 'none';
        document.body.style.overflow = '';
        previewModalBody.innerHTML = '';
    }

    // --- Toast ---
    function showToast(message, isError = false) {
        toastMessage.textContent = message;
        const icon = toast.querySelector('.toast-icon');

        if (isError) {
            toast.style.background = '#8C1D18';
            toast.style.color = '#F2B8B5';
            icon.textContent = 'error';
        } else {
            toast.style.background = '#1B5E35';
            toast.style.color = '#7DD99B';
            icon.textContent = 'check_circle';
        }

        toast.style.display = 'flex';
        toast.style.animation = 'toastIn 0.4s ease-out';

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.4s ease-out forwards';
            setTimeout(() => {
                toast.style.display = 'none';
                toast.style.animation = '';
            }, 400);
        }, 4000);
    }

    // --- Event Listeners ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        generatePDF();
    });

    previewBtn.addEventListener('click', showPreview);
    closePreview.addEventListener('click', hidePreview);
    closePreviewBtn.addEventListener('click', hidePreview);
    downloadFromPreview.addEventListener('click', () => {
        hidePreview();
        generatePDF();
    });

    // Close modal on overlay click
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) hidePreview();
    });

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && previewModal.style.display === 'flex') {
            hidePreview();
        }
    });

});
