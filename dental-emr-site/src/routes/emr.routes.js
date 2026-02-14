import { Router } from 'express';
import { supabase } from '../config/db.js';
import { auth, permit } from '../middleware/auth.js';
import { streamInvoicePdf } from '../services/pdf.js';

const router = Router();
router.use(auth);

// --- Patients ---
router.get('/patients', async (_req, res) => {
  const { data, error } = await supabase.from('patients').select('*').order('id', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/patients', permit('admin', 'reception', 'doctor'), async (req, res) => {
  const { name, phone, dob } = req.body;
  const { data, error } = await supabase
    .from('patients')
    .insert([{ name, phone: phone || '', dob: dob || '', created_at: new Date().toISOString() }])
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

// --- Appointments ---
router.get('/appointments', async (_req, res) => {
  // Join with patients to get name
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(name)')
    .order('datetime', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  
  // Flatten patient_name for frontend compatibility
  const flatData = data.map(a => ({
    ...a,
    patient_name: a.patients?.name || 'Unknown'
  }));
  res.json(flatData);
});

router.post('/appointments', permit('admin', 'reception', 'doctor'), async (req, res) => {
  const { patient_id, datetime, reason } = req.body;
  const { data, error } = await supabase
    .from('appointments')
    .insert([{ 
      patient_id, 
      datetime, 
      reason: reason || '', 
      created_at: new Date().toISOString() 
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

// --- Notes ---
router.get('/notes', async (_req, res) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*, patients(name)')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const flatData = data.map(n => ({
    ...n,
    patient_name: n.patients?.name || 'Unknown'
  }));
  res.json(flatData);
});

router.post('/notes', permit('admin', 'doctor'), async (req, res) => {
  const { patient_id, note } = req.body;
  const { data, error } = await supabase
    .from('notes')
    .insert([{ 
      patient_id, 
      note, 
      created_by: req.user.username, 
      created_at: new Date().toISOString() 
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

// --- Invoices ---
router.get('/invoices', async (_req, res) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, patients(name)')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const flatData = data.map(i => ({
    ...i,
    patient_name: i.patients?.name || 'Unknown'
  }));
  res.json(flatData);
});

router.post('/invoices', permit('admin', 'reception'), async (req, res) => {
  const { patient_id, amount, status, description } = req.body;
  const { data, error } = await supabase
    .from('invoices')
    .insert([{ 
      patient_id, 
      amount, 
      status: status || 'unpaid', 
      description: description || '', 
      created_at: new Date().toISOString() 
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

router.get('/invoices/:id/pdf', async (req, res) => {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, patients(name, phone, dob)')
    .eq('id', req.params.id)
    .single();

  if (error || !invoice) return res.status(404).json({ error: 'Invoice not found' });

  // Flatten for PDF generator
  const fullInvoice = {
    ...invoice,
    patient_name: invoice.patients?.name,
    phone: invoice.patients?.phone,
    dob: invoice.patients?.dob
  };

  streamInvoicePdf(res, fullInvoice);
});

// --- Treatment Plans ---
router.get('/treatment-plans', async (_req, res) => {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*, patients(name)')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const flatData = data.map(t => ({
    ...t,
    patient_name: t.patients?.name || 'Unknown'
  }));
  res.json(flatData);
});

router.post('/treatment-plans', permit('admin', 'doctor'), async (req, res) => {
  const { patient_id, diagnosis, plan, estimated_cost, status } = req.body;
  const { data, error } = await supabase
    .from('treatment_plans')
    .insert([{ 
      patient_id, 
      diagnosis, 
      plan, 
      estimated_cost: estimated_cost || 0, 
      status: status || 'proposed', 
      created_by: req.user.username, 
      created_at: new Date().toISOString() 
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

// --- Prescriptions ---
router.get('/prescriptions', async (_req, res) => {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*, patients(name)')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const flatData = data.map(r => ({
    ...r,
    patient_name: r.patients?.name || 'Unknown'
  }));
  res.json(flatData);
});

router.post('/prescriptions', permit('admin', 'doctor'), async (req, res) => {
  const { patient_id, medication, dosage, frequency, duration, instructions } = req.body;
  const { data, error } = await supabase
    .from('prescriptions')
    .insert([{ 
      patient_id, 
      medication, 
      dosage, 
      frequency, 
      duration, 
      instructions: instructions || '', 
      prescribed_by: req.user.username, 
      created_at: new Date().toISOString() 
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

export default router;
