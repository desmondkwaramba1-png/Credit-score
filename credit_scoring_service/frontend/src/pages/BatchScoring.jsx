import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiFileAddLine, RiUploadCloud2Line, RiPlayCircleLine, RiCheckLine,
  RiErrorWarningLine, RiInformationLine, RiLoader4Line, RiCloseLine,
  RiArrowRightLine, RiSparklingLine
} from 'react-icons/ri';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton, cn, staggerContainer, staggerItem
} from '../components/ui';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8001/v1';

export default function BatchScoring() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Single form state
  const [formData, setFormData] = useState({
    person_age: 30,
    person_income: 50000,
    person_home_ownership: 'RENT',
    person_emp_length: 5,
    loan_intent: 'PERSONAL',
    loan_grade: 'A',
    loan_amnt: 10000,
    loan_int_rate: 10.5,
    loan_percent_income: 0.2,
    cb_person_default_on_file: 'N',
    cb_person_cred_hist_length: 7
  });

  // Bulk state
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [batchResults, setBatchResults] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/score?mode=test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Scoring failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid CSV file.');
    }
  };

  const handleBulkSubmit = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setBatchResults(null);

    try {
      // For this demo, we read the CSV and convert to JSON objects
      // Real production might handle multipart, but our API takes a JSON List
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const payload = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
          const val = values[index]?.trim();
          // Type casting based on schema
          if (['person_age', 'person_income', 'person_emp_length', 'loan_amnt', 'loan_int_rate', 'loan_percent_income', 'cb_person_cred_hist_length'].includes(header)) {
            obj[header] = parseFloat(val) || 0;
          } else {
            obj[header] = val;
          }
        });
        return obj;
      }).filter(obj => Object.keys(obj).length === headers.length);

      if (payload.length === 0) throw new Error('No valid data found in CSV');

      const res = await fetch(`${API_BASE}/score/batch?mode=test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(payload.slice(0, 100)) // Cap at 100 as per API
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Batch scoring failed');
      }

      const data = await res.json();
      setBatchResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-black font-heading text-[#1A2035]">Risk Assessment Center</h1>
        <p className="text-sm text-[#6B7A99] mt-1">
          Perform real-time credit scoring for single borrowers or batch process portfolios via CSV.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={staggerItem} className="flex gap-4 border-b border-[#E3E8F0]">
        <button
          onClick={() => setActiveTab('single')}
          className={cn(
            'px-4 py-2 text-sm font-bold transition-all border-b-2',
            activeTab === 'single' ? 'border-[#00A8CB] text-[#00A8CB]' : 'border-transparent text-[#6B7A99] hover:text-[#1A2035]'
          )}
        >
          Single Borrower
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={cn(
            'px-4 py-2 text-sm font-bold transition-all border-b-2',
            activeTab === 'bulk' ? 'border-[#00A8CB] text-[#00A8CB]' : 'border-transparent text-[#6B7A99] hover:text-[#1A2035]'
          )}
        >
          Bulk CSV Scoring
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Panel */}
        <motion.div variants={staggerItem} className="lg:col-span-2">
          {activeTab === 'single' ? (
            <Card>
              <CardHeader>
                <CardTitle>Borrower Details</CardTitle>
                <CardDescription>Enter financial and demographic data for immediate ML inference.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Age</label>
                    <input type="number" name="person_age" value={formData.person_age} onChange={handleInputChange} className="tu-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Annual Income ($)</label>
                    <input type="number" name="person_income" value={formData.person_income} onChange={handleInputChange} className="tu-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Home Ownership</label>
                    <select name="person_home_ownership" value={formData.person_home_ownership} onChange={handleInputChange} className="tu-input">
                      <option value="RENT">Rent</option>
                      <option value="MORTGAGE">Mortgage</option>
                      <option value="OWN">Own</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Employment Length (Yrs)</label>
                    <input type="number" name="person_emp_length" value={formData.person_emp_length} onChange={handleInputChange} className="tu-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Loan Intent</label>
                    <select name="loan_intent" value={formData.loan_intent} onChange={handleInputChange} className="tu-input">
                      <option value="PERSONAL">Personal</option>
                      <option value="EDUCATION">Education</option>
                      <option value="MEDICAL">Medical</option>
                      <option value="VENTURE">Venture</option>
                      <option value="HOMEIMPROVEMENT">Home Improvement</option>
                      <option value="DEBTCONSOLIDATION">Debt Consolidation</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Loan Amount ($)</label>
                    <input type="number" name="loan_amnt" value={formData.loan_amnt} onChange={handleInputChange} className="tu-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Interest Rate (%)</label>
                    <input type="number" step="0.1" name="loan_int_rate" value={formData.loan_int_rate} onChange={handleInputChange} className="tu-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Historical Default</label>
                    <select name="cb_person_default_on_file" value={formData.cb_person_default_on_file} onChange={handleInputChange} className="tu-input">
                      <option value="N">No</option>
                      <option value="Y">Yes</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 pt-4">
                    <Button type="submit" className="w-full h-11" disabled={loading}>
                      {loading ? <RiLoader4Line className="animate-spin text-xl" /> : <><RiPlayCircleLine className="text-xl" /> Generate Credit Score</>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center py-12 px-6 text-center border-dashed border-2 border-[#C8D3E6]">
              <div className="w-16 h-16 rounded-full bg-[#E6F7FB] flex items-center justify-center mb-4">
                <RiUploadCloud2Line className="text-3xl text-[#00A8CB]" />
              </div>
              <h3 className="text-lg font-black text-[#1A2035] mb-2">Upload Portfolio CSV</h3>
              <p className="text-sm text-[#6B7A99] max-w-sm mb-6">
                Drag and drop your SME portfolio file here. Supported format: CSV (max 100 rows).
              </p>
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileSelect}
              />
              
              {selectedFile ? (
                <div className="w-full max-w-md p-4 rounded-xl bg-[#F5F7FA] border border-[#E3E8F0] flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <RiFileAddLine className="text-xl text-[#00A8CB]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#1A2035] truncate max-w-[200px]">{selectedFile.name}</p>
                      <p className="text-[10px] text-[#A8B8D0]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-[#E3E8F0] rounded-full transition-colors">
                    <RiCloseLine className="text-lg text-[#6B7A99]" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="mb-6">
                  Select File
                </Button>
              )}

              <Button
                className="w-full max-w-sm"
                disabled={!selectedFile || loading}
                onClick={handleBulkSubmit}
              >
                {loading ? <RiLoader4Line className="animate-spin text-xl" /> : <><RiSparklingLine className="text-xl" /> Start Batch Processing</>}
              </Button>

              <div className="mt-8 p-4 rounded-xl bg-[#FFF9EB] border border-[#FEF3C7] flex items-start gap-3 text-left max-w-md">
                <RiInformationLine className="text-[#F59E0B] mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#B45309] mb-1">CSV Template Required</p>
                  <p className="text-[10px] text-[#B45309]/80 leading-relaxed">
                    Ensure your CSV contains headers: <code>person_age, person_income, person_home_ownership, person_emp_length, loan_intent, loan_grade, loan_amnt, loan_int_rate, loan_percent_income, cb_person_default_on_file, cb_person_cred_hist_length</code>.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </motion.div>

        {/* Right: Results Panel */}
        <motion.div variants={staggerItem}>
          <AnimatePresence mode="wait">
            {!result && !batchResults && !error ? (
              <Card className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#F8FAFC]">
                <div className="w-12 h-12 rounded-full bg-[#E2E8F0] flex items-center justify-center mb-4">
                  <RiPulseLine className="text-xl text-[#94A3B8]" />
                </div>
                <p className="text-sm font-semibold text-[#64748B]">Awaiting analysis…</p>
                <p className="text-xs text-[#94A3B8] mt-1">Submit borrower data to see results here.</p>
              </Card>
            ) : error ? (
              <Card className="border-[#EF4444] bg-[#FEF2F2]">
                <CardContent className="p-6 text-center">
                  <RiErrorWarningLine className="text-4xl text-[#EF4444] mx-auto mb-3" />
                  <h3 className="text-base font-bold text-[#B91C1C] mb-1">Analysis Error</h3>
                  <p className="text-xs text-[#B91C1C]/80">{error}</p>
                </CardContent>
              </Card>
            ) : result ? (
              <Card className="overflow-hidden" style={{ borderTop: '4px solid #00A8CB' }}>
                <CardHeader className="bg-[#F8FAFC] border-b">
                  <Badge className="bg-[#E6F7FB] text-[#007FA3] mb-2">Analysis Complete</Badge>
                  <CardTitle>Score Result</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex flex-col items-center py-4">
                    <span className="text-[4rem] font-black font-heading leading-none text-[#1A2035]">
                      {result.credit_score}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mt-2"
                      style={{
                        background: result.risk_level === 'LOW' ? '#E6F9F2' : result.risk_level === 'MEDIUM' ? '#FEF3C7' : '#FEF2F2',
                        color: result.risk_level === 'LOW' ? '#00806D' : result.risk_level === 'MEDIUM' ? '#B45309' : '#B91C1C'
                      }}>
                      {result.risk_level} Risk
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#6B7A99] font-semibold">Probability of Default</span>
                      <span className="font-bold text-[#1A2035]">{(result.probability_of_default * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F0F3F8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00A8CB]" style={{ width: `${result.probability_of_default * 100}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#6B7A99] font-semibold">Confidence Level</span>
                      <span className="font-bold text-[#1A2035]">{((result.confidence || 0.95) * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <p className="text-xs font-bold text-[#1A2035]">Risk Flags:</p>
                    {result.risk_flags?.length > 0 ? (
                      result.risk_flags.map((f, i) => (
                        <div key={i} className="flex gap-2 text-[11px] text-[#6B7A99] leading-relaxed">
                          <RiCheckLine className="text-[#00B67A] shrink-0 mt-0.5" /> {f}
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-[#6B7A99] italic">No significant risk flags detected.</p>
                    )}
                  </div>

                  <Button variant="outline" className="w-full mt-4" onClick={() => setResult(null)}>
                    Perform New Check
                  </Button>
                </CardContent>
              </Card>
            ) : batchResults ? (
              <Card className="overflow-hidden" style={{ borderTop: '4px solid #00B67A' }}>
                <CardHeader className="bg-[#F8FAFC] border-b">
                  <CardTitle>Batch Summary</CardTitle>
                  <CardDescription>Processed {batchResults.count} records</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-[#E6F9F2] text-center">
                      <p className="text-[10px] font-bold text-[#00806D] uppercase">Avg Score</p>
                      <p className="text-2xl font-black text-[#00806D]">{batchResults.average_score}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FEF3C7] text-center">
                      <p className="text-[10px] font-bold text-[#B45309] uppercase">At Risk</p>
                      <p className="text-2xl font-black text-[#B45309]">{batchResults.at_risk_count}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[#1A2035]">Sample Results:</p>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                      {batchResults.results?.slice(0, 5).map((r, i) => (
                        <div key={i} className="p-2 bg-[#F5F7FA] rounded-lg flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-[#6B7A99]">Item #{i+1}</span>
                          <span className={cn('text-xs font-bold', r.risk_level === 'LOW' ? 'text-[#00806D]' : 'text-[#B91C1C]')}>
                            {r.credit_score} ({r.risk_level})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full mt-4" onClick={() => {
                    // In a real app, this would trigger a CSV download of the results
                    alert('Full results CSV would be downloaded here in production.');
                  }}>
                    <RiDownloadLine /> Export Results
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
