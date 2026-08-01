'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { signUp } from '@/lib/supabase/auth';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase/config';

export default function ImportPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState({ processed: 0, total: 0, errors: 0 });

  // Check if user is Super Admin (Role 8)
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);
  if (!isSuperAdmin) {
    router.push('/dashboard');
    return null;
  }

  const downloadSampleExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Fetch temples dynamically
      let templeOptions: any[] = [];
      if (supabase) {
        const { data: temples } = await supabase
          .from('temples')
          .select('name')
          .order('name');
        if (temples) {
          templeOptions = temples.map((t: any) => ({ "Temple Name": t.name }));
        }
      }
      if (templeOptions.length === 0) {
        templeOptions = [{ "Temple Name": "ISKCON Delhi" }, { "Temple Name": "ISKCON Mumbai" }];
      }

      // Ashram options list
      const ashramOptions = [
        { "Ashram Option": "Student and Not decided" },
        { "Ashram Option": "Working and Not Decided" },
        { "Ashram Option": "Gauranga Sabha" },
        { "Ashram Option": "Nityananda Sabha" },
        { "Ashram Option": "Brahmachari" },
        { "Ashram Option": "Grihastha" },
        { "Ashram Option": "Staying Single (Not planning to marry)" }
      ];

      // Simple sample user template data
      const sampleData = [
        {
          name: "John Doe",
          email: "john.doe@example.com",
          mobile: "9876543210",
          ashram: "Brahmachari",
          current_temple: templeOptions[0]?.["Temple Name"] || "ISKCON Delhi"
        },
        {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          mobile: "9876543211",
          ashram: "Grihastha",
          current_temple: templeOptions[1]?.["Temple Name"] || "ISKCON Mumbai"
        }
      ];

      const workbook = XLSX.utils.book_new();

      // Sheet 1: Users Template
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users Template");

      // Sheet 2: Temples Reference list
      const templeWorksheet = XLSX.utils.json_to_sheet(templeOptions);
      XLSX.utils.book_append_sheet(workbook, templeWorksheet, "Temples Reference");

      // Sheet 3: Ashrams Reference list
      const ashramWorksheet = XLSX.utils.json_to_sheet(ashramOptions);
      XLSX.utils.book_append_sheet(workbook, ashramWorksheet, "Ashrams Reference");
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'voice_gurukul_users_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || 'Failed to download sample file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.name.endsWith('.xlsx') ||
        selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        setFile(null);
      }
    }
  };

  const parseExcel = async (file: File): Promise<any[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Dynamically import xlsx to avoid SSR issues
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          } catch (error) {
            reject(new Error('Failed to parse Excel file. Please ensure it is a valid Excel file.'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(new Error('Failed to load Excel parser. Please refresh the page and try again.'));
      }
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress({ processed: 0, total: 0, errors: 0 });

    try {
      // Parse Excel file
      const data = await parseExcel(file);
      setProgress({ processed: 0, total: data.length, errors: 0 });

      let processed = 0;
      let errors = 0;
      const errorMessages: string[] = [];

      // Fetch temples and centers for location resolution
      let templesList: any[] = [];
      let centersList: any[] = [];
      if (supabase) {
        const [templesRes, centersRes] = await Promise.all([
          supabase.from('temples').select('name, state, city'),
          supabase.from('centers').select('name, temple_name, state, city')
        ]);
        templesList = templesRes.data || [];
        centersList = centersRes.data || [];
      }

      // Process each row
      for (const row of data) {
        try {
          // Expected columns: name, email, password, state, city, center, role, ashram, temple, mobile
          const name = row.name || row.Name || '';
          const email = row.email || row.Email || row['email id'] || row['Email id'] || row['Email ID'] || '';
          const password = row.password || row.Password || `TempPass${Date.now()}`;
          
          // Support variations like 'ashram status', 'Ashram Status', etc.
          const rawAshram = (row.ashram || row.Ashram || row['ashram status'] || row['Ashram status'] || row['Ashram Status'] || '').toString().trim().toLowerCase();
          
          // Map ashram string safely to database constraint valid values
          let ashram = 'Not decided';
          if (rawAshram.includes('student') || rawAshram === 'not decided' || rawAshram.includes('student and not decided')) ashram = 'Student and Not decided';
          else if (rawAshram.includes('working')) ashram = 'Working and Not Decided';
          else if (rawAshram.includes('gauranga')) ashram = 'Gauranga Sabha';
          else if (rawAshram.includes('nityananda')) ashram = 'Nityananda Sabha';
          else if (rawAshram.includes('brahmachari')) ashram = 'Brahmachari';
          else if (rawAshram.includes('grihastha') || rawAshram.includes('grahasta')) ashram = 'Grihastha';
          else if (rawAshram.includes('single')) ashram = 'Staying Single (Not planning to marry)';
          else if (rawAshram) ashram = 'Working and Not Decided'; // Default fallback if provided but unknown
          
          // Support variations like 'current temple', 'current temple location', 'Current Temple Location', etc.
          const current_temple = (row.temple || row.Temple || row['current temple'] || row['Current temple'] || row['Current Temple'] || row['current temple location'] || row['Current temple location'] || row['Current Temple Location'] || row.current_temple || row.current_temple_location || row.currentTemple || '').toString().trim();
          
          // Auto-resolve location from temple
          let state = (row.state || row.State || '').toString().trim();
          let city = (row.city || row.City || '').toString().trim();
          let center = (row.center || row.Center || '').toString().trim();

          if (current_temple) {
            const matchedTemple = templesList.find(t => t.name.toLowerCase() === current_temple.toLowerCase());
            if (matchedTemple) {
              if (!state) state = matchedTemple.state;
              if (!city) city = matchedTemple.city;
              
              if (!center) {
                const matchedCenter = centersList.find(c => c.temple_name?.toLowerCase() === matchedTemple.name.toLowerCase());
                if (matchedCenter) {
                  center = matchedCenter.name;
                }
              }
            }
          }
          
          // Support variations like 'mobile number', 'Mobile Number', etc.
          const phone = row.mobile || row.Mobile || row.phone || row.Phone || row['mobile number'] || row['Mobile number'] || row['Mobile Number'] || row.mobile_number || row.mobileNumber || '';

          // Support multiple roles: comma-separated or single role
          const roleInput = (row.role || row.Role || 'student').toString().trim();
          const roles: UserRole[] = roleInput.includes(',')
            ? roleInput.split(',').map((r: string) => r.trim() as UserRole).filter((r: UserRole) => !!r)
            : [roleInput as UserRole];

          if (!name || !email) {
            errors++;
            continue;
          }

          // Create user with multiple roles
          await signUp(
            email,
            password,
            name,
            roles,
            {
              state: state || undefined,
              city: city || undefined,
              center: center || undefined,
              ashram: ashram || undefined,
              current_temple: current_temple || undefined,
              phone: phone || undefined,
            }
          );

          processed++;
          setProgress({ processed, total: data.length, errors });
        } catch (err: any) {
          console.error('Error importing user:', err);
          errors++;
          setProgress({ processed, total: data.length, errors });
          errorMessages.push(`Row ${processed + errors} (${row.name || row.email || 'Unknown'}): ${err.message || 'Unknown error'}`);
        }
      }

      setSuccess(`Successfully imported ${processed} users. ${errors} errors.`);
      if (errorMessages.length > 0) {
        setError(errorMessages.join(' | '));
      }
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById('excel-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Users from Excel</h1>
        <p className="text-gray-600 mt-2">Upload an Excel file to bulk import users</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">File Format</h2>
            <button
              onClick={downloadSampleExcel}
              className="text-sm bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download Excel Template
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">Your Excel file should have the following columns:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>name</strong> (required) - Full name of the user</li>
              <li><strong>email</strong> (required) - Email address</li>
              <li><strong>mobile</strong> (optional) - Mobile/phone number</li>
              <li><strong>ashram</strong> (optional) - Ashram status (e.g. &quot;Brahmachari&quot;, &quot;Grihastha&quot;). Check the &quot;Ashrams Reference&quot; sheet in the template.</li>
              <li><strong>temple</strong> (optional) - Current temple location. Check the &quot;Temples Reference&quot; sheet in the template.</li>
              <li><strong>role</strong> (optional) - User role(s) if other than counselor (defaults to &quot;counselor&quot;).</li>
              <li><strong>password</strong> (optional) - Password (if not provided, a temporary password will be generated)</li>
            </ul>
          </div>
        </div>

        <div>
          <label htmlFor="excel-file" className="block text-sm font-medium text-gray-700 mb-2">
            Select Excel File (.xlsx or .xls)
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex-1 cursor-pointer">
              <input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
                <FileSpreadsheet className="h-8 w-8 text-gray-400 mr-3" />
                <span className="text-gray-600">
                  {file ? file.name : 'Click to select Excel file'}
                </span>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        {loading && progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Processing: {progress.processed} / {progress.total}</span>
              <span>Errors: {progress.errors}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              Import Users
            </>
          )}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> The Excel file will be parsed using the xlsx library.
          Ensure your Excel file has the correct column headers as shown above.
          All users will be created with &quot;student&quot; role by default unless specified in the role column.
        </p>
      </div>
    </div>
  );
}
