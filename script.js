const API_BASE = 'https://job-application-form-production.up.railway.app';

const form = document.getElementById('applicationForm');
const positionSelect = document.getElementById('positionId');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');
const dropzone = document.getElementById('dropzone');
const dropzoneText = document.getElementById('dropzoneText');
const resumeInput = document.getElementById('resume');
const railItems = document.querySelectorAll('.rail__item');
const cards = document.querySelectorAll('.card');

// ---------------------------------------------------------
// Load open positions into the dropdown
// ---------------------------------------------------------
async function loadPositions() {
  try {
    const res = await fetch(`${API_BASE}/positions`);
    const positions = await res.json();

    positionSelect.innerHTML = '<option value="" disabled selected>Select a position</option>';
    positions.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.title} — ${p.department} (${p.location})`;
      positionSelect.appendChild(opt);
    });
  } catch (err) {
    positionSelect.innerHTML = '<option value="" disabled selected>Could not load positions</option>';
  }
}
loadPositions();

// ---------------------------------------------------------
// Progress rail: highlight section currently in view
// ---------------------------------------------------------
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const step = entry.target.dataset.section;
      railItems.forEach(item => {
        item.classList.toggle('is-active', item.dataset.step === step);
        item.classList.toggle('is-done', Number(item.dataset.step) < Number(step));
      });
    }
  });
}, { rootMargin: '-40% 0px -50% 0px' });

cards.forEach(card => observer.observe(card));

// ---------------------------------------------------------
// Dropzone interactions
// ---------------------------------------------------------
resumeInput.addEventListener('change', () => {
  if (resumeInput.files.length) {
    dropzoneText.textContent = resumeInput.files[0].name;
  }
});
['dragenter', 'dragover'].forEach(evt =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('is-drag'); })
);
['dragleave', 'drop'].forEach(evt =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('is-drag'); })
);
dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length) {
    resumeInput.files = e.dataTransfer.files;
    dropzoneText.textContent = e.dataTransfer.files[0].name;
  }
});

// ---------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------
function setFieldError(fieldEl, message) {
  const wrapper = fieldEl.closest('.field');
  wrapper.classList.toggle('has-error', Boolean(message));
  const errorEl = wrapper.querySelector('.field__error');
  if (errorEl) errorEl.textContent = message || '';
}

function validateForm() {
  let valid = true;

  const requiredFields = [
    ['firstName', 'First name is required'],
    ['lastName', 'Last name is required'],
    ['phone', 'Phone number is required'],
    ['highestEducation', 'Please select your education level'],
    ['yearsExperience', 'Years of experience is required'],
    ['positionId', 'Please select a position']
  ];

  requiredFields.forEach(([name, msg]) => {
    const el = form.elements[name];
    if (!el.value.trim()) {
      setFieldError(el, msg);
      valid = false;
    } else {
      setFieldError(el, '');
    }
  });

  const emailEl = form.elements['email'];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(emailEl.value)) {
    setFieldError(emailEl, 'Enter a valid email address');
    valid = false;
  } else {
    setFieldError(emailEl, '');
  }

  if (!resumeInput.files.length) {
    setFieldError(resumeInput, 'Please attach your resume');
    valid = false;
  } else {
    const sizeOk = resumeInput.files[0].size <= 5 * 1024 * 1024;
    if (!sizeOk) {
      setFieldError(resumeInput, 'File must be under 5MB');
      valid = false;
    } else {
      setFieldError(resumeInput, '');
    }
  }

  return valid;
}

// ---------------------------------------------------------
// Submit
// ---------------------------------------------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formStatus.textContent = '';
  formStatus.className = 'submit-row__note';

  if (!validateForm()) {
    formStatus.textContent = 'Please fix the highlighted fields.';
    formStatus.classList.add('is-error');
    const firstError = form.querySelector('.has-error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  try {
    const formData = new FormData(form);
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Submission failed');
    }

    formStatus.textContent = 'Application submitted. We will be in touch by email.';
    formStatus.classList.add('is-success');
    form.reset();
    dropzoneText.textContent = 'Drop a PDF or Word file here, or click to browse. Max 5MB.';
  } catch (err) {
    formStatus.textContent = err.message || 'Something went wrong. Please try again.';
    formStatus.classList.add('is-error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit application';
  }
});
