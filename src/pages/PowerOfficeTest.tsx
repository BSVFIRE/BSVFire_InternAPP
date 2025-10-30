/**
 * PowerOffice API Test Page
 * Simple UI for testing PowerOffice integration via Supabase Edge Function
 */

import { useState } from 'react';
import { powerofficeClient } from '../services/poweroffice/edge-client';

// Common units of measure
const UNITS_OF_MEASURE = [
  { Code: 'EA', Name: 'Each (Stykk)' },
  { Code: 'STK', Name: 'Stykk' },
  { Code: 'KG', Name: 'Kilogram' },
  { Code: 'G', Name: 'Gram' },
  { Code: 'L', Name: 'Liter' },
  { Code: 'M', Name: 'Meter' },
  { Code: 'M2', Name: 'Kvadratmeter' },
  { Code: 'M3', Name: 'Kubikkmeter' },
  { Code: 'H', Name: 'Time' },
  { Code: 'DAY', Name: 'Dag' },
  { Code: 'PKG', Name: 'Pakke' },
  { Code: 'BOX', Name: 'Boks' },
];

// Product types
const PRODUCT_TYPES = [
  { Code: 'Product', Name: 'Produkt (Vare)' },
  { Code: 'Service', Name: 'Tjeneste' },
];

// Common Norwegian sales accounts
const SALES_ACCOUNTS = [
  { Id: 3000, Code: '3000', Name: 'Salgsinntekt, avgiftspliktig' },
  { Id: 3100, Code: '3100', Name: 'Salgsinntekt, avgiftsfri' },
  { Id: 3200, Code: '3200', Name: 'Salgsinntekt, utenfor mva-loven' },
  { Id: 3300, Code: '3300', Name: 'Salgsinntekt tjenester, avgiftspliktig' },
  { Id: 3400, Code: '3400', Name: 'Salgsinntekt tjenester, avgiftsfri' },
  { Id: 3900, Code: '3900', Name: 'Annen driftsinntekt' },
];

export default function PowerOfficeTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [editedCustomer, setEditedCustomer] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editedProduct, setEditedProduct] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('contact');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const runTest = async (testFn: () => Promise<any>, testName: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log(`Running test: ${testName}`);
      const data = await testFn();
      setResult(data);
      console.log(`${testName} result:`, data);
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      setError(errorMsg);
      console.error(`${testName} error:`, err);
    } finally {
      setLoading(false);
    }
  };

  const testClientInfo = async () => {
    const info = await powerofficeClient.getClientInfo();
    console.log('Client Integration Info:', info);
    console.log('Privileges:', info);
    return info;
  };

  const testCustomers = async () => {
    return await powerofficeClient.getCustomers({ page: 1, pageSize: 10 });
  };

  const testProducts = async () => {
    return await powerofficeClient.getProducts({ page: 1, pageSize: 10 });
  };

  const testEmployees = async () => {
    return await powerofficeClient.getEmployees();
  };

  const testProjects = async () => {
    return await powerofficeClient.getProjects({ page: 1, pageSize: 10 });
  };

  const testInvoices = async () => {
    return await powerofficeClient.getInvoices({ page: 1, pageSize: 10 });
  };

  const handleEditCustomer = () => {
    setIsEditing(true);
    setEditedCustomer({ ...selectedCustomer });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCustomer(null);
  };

  const handleSaveCustomer = async () => {
    if (!editedCustomer) return;

    setSaving(true);
    try {
      console.log('Attempting to update customer:', editedCustomer.Id);
      
      // PowerOffice API requires JSON Patch format (RFC 6902)
      const patchOperations = [];
      
      if (editedCustomer.LegalName !== selectedCustomer.LegalName) {
        patchOperations.push({ op: 'replace', path: '/LegalName', value: editedCustomer.LegalName });
      }
      if (editedCustomer.Phone !== selectedCustomer.Phone) {
        patchOperations.push({ op: 'replace', path: '/Phone', value: editedCustomer.Phone || '' });
      }
      if (editedCustomer.InvoiceEmailAddress !== selectedCustomer.InvoiceEmailAddress) {
        patchOperations.push({ op: 'replace', path: '/InvoiceEmailAddress', value: editedCustomer.InvoiceEmailAddress || '' });
      }
      if (editedCustomer.OrganizationNumber !== selectedCustomer.OrganizationNumber) {
        patchOperations.push({ op: 'replace', path: '/OrganizationNumber', value: editedCustomer.OrganizationNumber || '' });
      }
      
      // Address fields
      if (editedCustomer.MailAddress?.AddressLine1 !== selectedCustomer.MailAddress?.AddressLine1) {
        patchOperations.push({ op: 'replace', path: '/MailAddress/AddressLine1', value: editedCustomer.MailAddress?.AddressLine1 || '' });
      }
      if (editedCustomer.MailAddress?.AddressLine2 !== selectedCustomer.MailAddress?.AddressLine2) {
        patchOperations.push({ op: 'replace', path: '/MailAddress/AddressLine2', value: editedCustomer.MailAddress?.AddressLine2 || '' });
      }
      if (editedCustomer.MailAddress?.ZipCode !== selectedCustomer.MailAddress?.ZipCode) {
        patchOperations.push({ op: 'replace', path: '/MailAddress/ZipCode', value: editedCustomer.MailAddress?.ZipCode || '' });
      }
      if (editedCustomer.MailAddress?.City !== selectedCustomer.MailAddress?.City) {
        patchOperations.push({ op: 'replace', path: '/MailAddress/City', value: editedCustomer.MailAddress?.City || '' });
      }
      if (editedCustomer.MailAddress?.CountryCode !== selectedCustomer.MailAddress?.CountryCode) {
        patchOperations.push({ op: 'replace', path: '/MailAddress/CountryCode', value: editedCustomer.MailAddress?.CountryCode || '' });
      }
      
      if (patchOperations.length === 0) {
        alert('Ingen endringer å lagre');
        setIsEditing(false);
        setSaving(false);
        return;
      }
      
      console.log('JSON Patch operations:', patchOperations);
      
      // Try to update via API (using PATCH method with JSON Patch format)
      await powerofficeClient.updateCustomer(editedCustomer.Id, patchOperations);
      
      console.log('✅ Customer updated successfully!');
      
      // Update in result list
      if (Array.isArray(result)) {
        const updatedResult = result.map((c: any) => 
          c.Id === editedCustomer.Id ? editedCustomer : c
        );
        setResult(updatedResult);
      }
      
      setSelectedCustomer(editedCustomer);
      setIsEditing(false);
      setEditedCustomer(null);
      alert('✅ Kunde oppdatert i PowerOffice!');
    } catch (err: any) {
      console.error('Save error:', err);
      
      // Fallback to local save if API fails
      if (Array.isArray(result)) {
        const updatedResult = result.map((c: any) => 
          c.Id === editedCustomer.Id ? editedCustomer : c
        );
        setResult(updatedResult);
      }
      
      setSelectedCustomer(editedCustomer);
      setIsEditing(false);
      setEditedCustomer(null);
      
      alert('⚠️ Kunne ikke lagre til PowerOffice API.\nEndringer lagret lokalt.\n\nFeil: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedCustomer((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: string, value: any) => {
    setEditedCustomer((prev: any) => ({
      ...prev,
      MailAddress: {
        ...prev.MailAddress,
        [field]: value
      }
    }));
  };

  // Product handlers
  const handleEditProduct = () => {
    setIsEditing(true);
    setEditedProduct({ ...selectedProduct });
  };

  const handleCancelProductEdit = () => {
    setIsEditing(false);
    setEditedProduct(null);
  };

  const handleCreateProduct = async () => {
    // Load product groups if not already loaded
    let groups = productGroups;
    if (groups.length === 0) {
      try {
        groups = await powerofficeClient.getProductGroups();
        setProductGroups(groups);
      } catch (err) {
        console.error('Failed to load product groups:', err);
      }
    }

    const newProduct = {
      Name: '',
      Code: '',
      UnitPrice: 0,
      UnitCost: 0,
      ProductType: 'Product',
      ProductGroupId: groups.length > 0 ? groups[0].Id : null,
      UnitOfMeasureCode: 'EA',
      IsStockItem: false,
      IsArchived: false,
      StandardSalesAccountId: null,
      OptionalSalesAccountId: null
    };
    
    console.log('Creating new product with:', newProduct);
    console.log('Product groups loaded:', groups.length);
    
    setSelectedProduct(newProduct);
    setEditedProduct(newProduct);
    setIsEditing(true);
  };

  const handleSaveProduct = async () => {
    if (!editedProduct) return;

    setSaving(true);
    try {
      console.log('Attempting to save product:', editedProduct);

      if (editedProduct.Id) {
        // Update existing product
        const patchOperations = [];
        
        if (editedProduct.Name !== selectedProduct.Name) {
          patchOperations.push({ op: 'replace', path: '/Name', value: editedProduct.Name });
        }
        if (editedProduct.Code !== selectedProduct.Code) {
          patchOperations.push({ op: 'replace', path: '/Code', value: editedProduct.Code || '' });
        }
        if (editedProduct.UnitPrice !== selectedProduct.UnitPrice) {
          patchOperations.push({ op: 'replace', path: '/UnitPrice', value: editedProduct.UnitPrice || 0 });
        }
        if (editedProduct.UnitCost !== selectedProduct.UnitCost) {
          patchOperations.push({ op: 'replace', path: '/UnitCost', value: editedProduct.UnitCost || 0 });
        }
        if (editedProduct.Description !== selectedProduct.Description) {
          patchOperations.push({ op: 'replace', path: '/Description', value: editedProduct.Description || '' });
        }

        if (patchOperations.length === 0) {
          alert('Ingen endringer å lagre');
          setIsEditing(false);
          setSaving(false);
          return;
        }

        console.log('JSON Patch operations:', patchOperations);
        await powerofficeClient.updateProduct(editedProduct.Id, patchOperations);

        // Update in result list
        if (Array.isArray(result)) {
          const updatedResult = result.map((p: any) => 
            p.Id === editedProduct.Id ? editedProduct : p
          );
          setResult(updatedResult);
        }

        setSelectedProduct(editedProduct);
        alert('✅ Produkt oppdatert i PowerOffice!');
      } else {
        // Create new product
        const newProduct = await powerofficeClient.createProduct(editedProduct);
        
        // Add to result list
        if (Array.isArray(result)) {
          setResult([newProduct, ...result]);
        }

        setSelectedProduct(newProduct);
        alert('✅ Nytt produkt opprettet i PowerOffice!');
      }

      setIsEditing(false);
      setEditedProduct(null);
    } catch (err: any) {
      console.error('Save error:', err);
      alert('❌ Feil ved lagring: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleProductFieldChange = (field: string, value: any) => {
    setEditedProduct((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PowerOffice Go API Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test PowerOffice API via Supabase Edge Function ✅
          </p>

          {/* Test Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => runTest(testClientInfo, 'Client Info')}
              disabled={loading}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Klient Info
            </button>

            <button
              onClick={() => runTest(testCustomers, 'Customers')}
              disabled={loading}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Hent Kunder
            </button>

            <button
              onClick={() => runTest(testProducts, 'Products')}
              disabled={loading}
              className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Hent Produkter
            </button>

            <button
              onClick={() => runTest(testEmployees, 'Employees')}
              disabled={loading}
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Hent Ansatte
            </button>

            <button
              onClick={() => runTest(testProjects, 'Projects')}
              disabled={loading}
              className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Hent Prosjekter
            </button>

            <button
              onClick={() => runTest(testInvoices, 'Invoices')}
              disabled={loading}
              className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Hent Fakturaer
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Laster...</span>
            </div>
          )}

          {/* Error Display */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-semibold mb-2">Feil</h3>
              <pre className="text-red-700 text-sm whitespace-pre-wrap overflow-auto">
                {error}
              </pre>
            </div>
          )}

          {/* Result Display */}
          {result && !loading && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-semibold mb-2">Resultat</h3>
              
              {/* Check if result is an array of customers */}
              {Array.isArray(result) && result.length > 0 && result[0].LegalName ? (
                /* Customer Table */
                <div className="bg-white rounded-lg overflow-hidden border border-green-100">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Navn
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            E-post
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Adresse
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.map((customer: any) => (
                          <tr 
                            key={customer.Id} 
                            onClick={() => setSelectedCustomer(customer)}
                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {customer.Id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.LegalName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {customer.InvoiceEmailAddress || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {customer.MailAddress?.AddressLine1 || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {customer.MailAddress?.City || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {customer.IsActive ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Aktiv
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Inaktiv
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Viser {result.length} kunde{result.length !== 1 ? 'r' : ''}
                    </p>
                  </div>
                </div>
              ) : Array.isArray(result) && result.length > 0 && result[0].InvoiceNo ? (
                /* Invoice Table */
                <div className="bg-white rounded-lg overflow-hidden border border-green-100">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-700">Fakturaer</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fakturanr
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kunde
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dato
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Forfallsdato
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Beløp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.map((invoice: any) => (
                          <tr 
                            key={invoice.Id} 
                            onClick={() => setSelectedInvoice(invoice)}
                            className="hover:bg-purple-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invoice.InvoiceNo}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {invoice.CustomerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(invoice.InvoiceDate).toLocaleDateString('nb-NO')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(invoice.DueDate).toLocaleDateString('nb-NO')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {invoice.TotalAmount?.toFixed(2)} kr
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {invoice.Status === 0 ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Utkast
                                </span>
                              ) : invoice.Status === 1 ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Sendt
                                </span>
                              ) : invoice.Status === 2 ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Betalt
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Annet
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Viser {result.length} faktura{result.length !== 1 ? 'er' : ''}
                    </p>
                  </div>
                </div>
              ) : Array.isArray(result) && result.length > 0 && result[0].Name ? (
                /* Product Table */
                <div className="bg-white rounded-lg overflow-hidden border border-green-100">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-700">Produkter</h3>
                    <button
                      onClick={handleCreateProduct}
                      className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      + Nytt Produkt
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Navn
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produktnr
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pris
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.map((product: any) => (
                          <tr 
                            key={product.Id} 
                            onClick={() => setSelectedProduct(product)}
                            className="hover:bg-orange-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {product.Id}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {product.Name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {product.Code || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {product.UnitPrice ? `${product.UnitPrice} kr` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {product.ProductType || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {!product.IsArchived ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Aktiv
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Arkivert
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Viser {result.length} produkt{result.length !== 1 ? 'er' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                /* Fallback to JSON view for other data types */
                <pre className="text-green-900 text-sm whitespace-pre-wrap overflow-auto max-h-96 bg-white p-4 rounded border border-green-100">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Instructions */}
          {!loading && !result && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-800 font-semibold mb-2">
                📋 Instruksjoner
              </h3>
              <ol className="text-blue-900 text-sm space-y-2 list-decimal list-inside">
                <li>PowerOffice API kalles via Supabase Edge Function</li>
                <li>Ingen CORS-problemer! ✅</li>
                <li>Start med "Klient Info" for å se privilegier</li>
                <li>Test de andre endpointene</li>
              </ol>
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 text-sm">
                  ✅ <strong>Edge Function deployed!</strong> Credentials er sikret på serveren.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Documentation Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Se{' '}
            <a
              href="/POWEROFFICE_API_GUIDE.md"
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              POWEROFFICE_API_GUIDE.md
            </a>{' '}
            for full dokumentasjon
          </p>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedCustomer(null);
            setActiveTab('contact');
          }}
        >
          <div 
            className="bg-gray-700 rounded-lg shadow-xl w-[1000px] h-[600px] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gray-700 px-6 py-4 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white">
                  {selectedCustomer.LegalName}
                </h2>
                {isEditing && (
                  <span className="px-2 py-1 text-xs bg-yellow-500 text-gray-900 rounded font-medium">
                    Redigerer
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setActiveTab('contact');
                  setIsEditing(false);
                  setEditedCustomer(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content with Sidebar */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Navigation */}
              <div className="w-64 bg-gray-600 overflow-y-auto">
                <nav className="p-4 space-y-1">
                  <button
                    onClick={() => setActiveTab('contact')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'contact'
                        ? 'bg-yellow-500 text-gray-900 font-medium'
                        : 'text-gray-200 hover:bg-gray-500'
                    }`}
                  >
                    Contact
                  </button>
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'addresses'
                        ? 'bg-yellow-500 text-gray-900 font-medium'
                        : 'text-gray-200 hover:bg-gray-500'
                    }`}
                  >
                    Addresses
                  </button>
                  <button
                    onClick={() => setActiveTab('invoice')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'invoice'
                        ? 'bg-yellow-500 text-gray-900 font-medium'
                        : 'text-gray-200 hover:bg-gray-500'
                    }`}
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'raw'
                        ? 'bg-yellow-500 text-gray-900 font-medium'
                        : 'text-gray-200 hover:bg-gray-500'
                    }`}
                  >
                    Raw Data
                  </button>
                </nav>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-gray-800 overflow-y-auto p-6">
                {/* Contact Tab */}
                {activeTab === 'contact' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-400">Name</label>
                          <input 
                            type="text" 
                            value={isEditing ? (editedCustomer?.LegalName || '') : (selectedCustomer.LegalName || '')} 
                            onChange={(e) => isEditing && handleFieldChange('LegalName', e.target.value)}
                            readOnly={!isEditing}
                            className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                              isEditing 
                                ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                                : 'bg-gray-700 border-gray-600'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-400">Phone</label>
                          <input 
                            type="text" 
                            value={isEditing ? (editedCustomer?.Phone || '') : (selectedCustomer.Phone || '-')} 
                            onChange={(e) => isEditing && handleFieldChange('Phone', e.target.value)}
                            readOnly={!isEditing}
                            className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                              isEditing 
                                ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                                : 'bg-gray-700 border-gray-600'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-400">E-mail</label>
                          <input 
                            type="text" 
                            value={isEditing ? (editedCustomer?.InvoiceEmailAddress || '') : (selectedCustomer.InvoiceEmailAddress || '-')} 
                            onChange={(e) => isEditing && handleFieldChange('InvoiceEmailAddress', e.target.value)}
                            readOnly={!isEditing}
                            className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                              isEditing 
                                ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                                : 'bg-gray-700 border-gray-600'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-400">Organization no</label>
                          <div className="flex gap-2 items-center mt-1">
                            <input 
                              type="text" 
                              value={isEditing ? (editedCustomer?.OrganizationNumber || '') : (selectedCustomer.OrganizationNumber || '-')} 
                              onChange={(e) => isEditing && handleFieldChange('OrganizationNumber', e.target.value)}
                              readOnly={!isEditing}
                              className={`flex-1 px-4 py-2 text-white border rounded-lg ${
                                isEditing 
                                  ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                                  : 'bg-gray-700 border-gray-600'
                              }`}
                            />
                            {selectedCustomer.IsVatFree === false && (
                              <span className="text-sm text-gray-400">✓ VAT registered</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Info */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-400">Customer Type</label>
                          <div className="mt-2 flex gap-4">
                            <label className="flex items-center text-white">
                              <input 
                                type="radio" 
                                checked={!selectedCustomer.IsPerson} 
                                readOnly
                                className="mr-2"
                              />
                              Company
                            </label>
                            <label className="flex items-center text-white">
                              <input 
                                type="radio" 
                                checked={selectedCustomer.IsPerson} 
                                readOnly
                                className="mr-2"
                              />
                              Person
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-400">Status</label>
                          <div className="mt-2">
                            {selectedCustomer.IsActive ? (
                              <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-green-600 text-white">
                                ✓ Active
                              </span>
                            ) : (
                              <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-gray-600 text-white">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-400">Customer No</label>
                          <input 
                            type="text" 
                            value={selectedCustomer.CustomerNo || '-'} 
                            readOnly
                            className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Addresses Tab */}
                {activeTab === 'addresses' && selectedCustomer.MailAddress && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">
                      Mail Address
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Address Line 1</label>
                        <input 
                          type="text" 
                          value={isEditing ? (editedCustomer?.MailAddress?.AddressLine1 || '') : (selectedCustomer.MailAddress.AddressLine1 || '-')} 
                          onChange={(e) => isEditing && handleAddressChange('AddressLine1', e.target.value)}
                          readOnly={!isEditing}
                          className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                            isEditing 
                              ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                              : 'bg-gray-700 border-gray-600'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Address Line 2</label>
                        <input 
                          type="text" 
                          value={isEditing ? (editedCustomer?.MailAddress?.AddressLine2 || '') : (selectedCustomer.MailAddress.AddressLine2 || '-')} 
                          onChange={(e) => isEditing && handleAddressChange('AddressLine2', e.target.value)}
                          readOnly={!isEditing}
                          className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                            isEditing 
                              ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                              : 'bg-gray-700 border-gray-600'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Zip Code</label>
                        <input 
                          type="text" 
                          value={isEditing ? (editedCustomer?.MailAddress?.ZipCode || '') : (selectedCustomer.MailAddress.ZipCode || '-')} 
                          onChange={(e) => isEditing && handleAddressChange('ZipCode', e.target.value)}
                          readOnly={!isEditing}
                          className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                            isEditing 
                              ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                              : 'bg-gray-700 border-gray-600'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">City</label>
                        <input 
                          type="text" 
                          value={isEditing ? (editedCustomer?.MailAddress?.City || '') : (selectedCustomer.MailAddress.City || '-')} 
                          onChange={(e) => isEditing && handleAddressChange('City', e.target.value)}
                          readOnly={!isEditing}
                          className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                            isEditing 
                              ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                              : 'bg-gray-700 border-gray-600'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Country</label>
                        <input 
                          type="text" 
                          value={isEditing ? (editedCustomer?.MailAddress?.CountryCode || '') : (selectedCustomer.MailAddress.CountryCode || '-')} 
                          onChange={(e) => isEditing && handleAddressChange('CountryCode', e.target.value)}
                          readOnly={!isEditing}
                          className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                            isEditing 
                              ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                              : 'bg-gray-700 border-gray-600'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Tab */}
                {activeTab === 'invoice' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">
                      Invoice Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-400">Invoice Email</label>
                        <input 
                          type="text" 
                          value={selectedCustomer.InvoiceEmailAddress || '-'} 
                          readOnly
                          className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Invoice Email CC</label>
                        <input 
                          type="text" 
                          value={selectedCustomer.InvoiceEmailAddressCC || '-'} 
                          readOnly
                          className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Delivery Type</label>
                        <input 
                          type="text" 
                          value={selectedCustomer.InvoiceDeliveryType || '-'} 
                          readOnly
                          className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">VAT Free</label>
                        <input 
                          type="text" 
                          value={selectedCustomer.IsVatFree ? 'Yes' : 'No'} 
                          readOnly
                          className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw Data Tab */}
                {activeTab === 'raw' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">
                      Raw JSON Data
                    </h3>
                    <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded border border-gray-600 overflow-auto max-h-[600px]">
                      {JSON.stringify(selectedCustomer, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-700 border-t border-gray-600 px-6 py-4 flex justify-between">
              <div>
                {!isEditing && (
                  <button
                    onClick={handleEditCustomer}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Rediger
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (isEditing) {
                      handleCancelEdit();
                    } else {
                      setSelectedCustomer(null);
                      setActiveTab('contact');
                    }
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  {isEditing ? 'Avbryt' : 'Lukk'}
                </button>
                {isEditing && (
                  <button
                    onClick={handleSaveCustomer}
                    disabled={saving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Lagrer...' : 'Lagre'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedProduct(null);
            setActiveTab('info');
            setIsEditing(false);
            setEditedProduct(null);
          }}
        >
          <div 
            className="bg-gray-700 rounded-lg shadow-xl w-[1000px] h-[600px] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gray-700 px-6 py-4 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white">
                  {selectedProduct.Name}
                </h2>
                {isEditing && (
                  <span className="px-2 py-1 text-xs bg-yellow-500 text-gray-900 rounded font-medium">
                    Redigerer
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setActiveTab('info');
                  setIsEditing(false);
                  setEditedProduct(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Produktnavn *</label>
                    <input 
                      type="text" 
                      value={isEditing ? (editedProduct?.Name || '') : (selectedProduct.Name || '')} 
                      onChange={(e) => isEditing && handleProductFieldChange('Name', e.target.value)}
                      readOnly={!isEditing}
                      className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                        isEditing 
                          ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Produktnummer (Code)</label>
                    <input 
                      type="text" 
                      value={isEditing ? (editedProduct?.Code || '') : (selectedProduct.Code || '')} 
                      onChange={(e) => isEditing && handleProductFieldChange('Code', e.target.value)}
                      readOnly={!isEditing}
                      className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                        isEditing 
                          ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">GTIN (Strekkode)</label>
                    <input 
                      type="text" 
                      value={isEditing ? (editedProduct?.Gtin || '') : (selectedProduct.Gtin || '')} 
                      onChange={(e) => isEditing && handleProductFieldChange('Gtin', e.target.value)}
                      readOnly={!isEditing}
                      className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                        isEditing 
                          ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Salgspris (UnitPrice)</label>
                    <input 
                      type="number" 
                      value={isEditing ? (editedProduct?.UnitPrice || 0) : (selectedProduct.UnitPrice || 0)} 
                      onChange={(e) => isEditing && handleProductFieldChange('UnitPrice', parseFloat(e.target.value) || 0)}
                      readOnly={!isEditing}
                      className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                        isEditing 
                          ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Kostpris (UnitCost)</label>
                    <input 
                      type="number" 
                      value={isEditing ? (editedProduct?.UnitCost || 0) : (selectedProduct.UnitCost || 0)} 
                      onChange={(e) => isEditing && handleProductFieldChange('UnitCost', parseFloat(e.target.value) || 0)}
                      readOnly={!isEditing}
                      className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                        isEditing 
                          ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Produkttype</label>
                    {isEditing ? (
                      <select
                        value={editedProduct?.ProductType || ''}
                        onChange={(e) => handleProductFieldChange('ProductType', e.target.value)}
                        className="mt-1 w-full px-4 py-2 bg-gray-600 text-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Velg type...</option>
                        {PRODUCT_TYPES.map((type) => (
                          <option key={type.Code} value={type.Code}>
                            {type.Name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={selectedProduct.ProductType || '-'} 
                        readOnly
                        className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Enhet</label>
                    {isEditing ? (
                      <select
                        value={editedProduct?.UnitOfMeasureCode || ''}
                        onChange={(e) => handleProductFieldChange('UnitOfMeasureCode', e.target.value)}
                        className="mt-1 w-full px-4 py-2 bg-gray-600 text-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Velg enhet...</option>
                        {UNITS_OF_MEASURE.map((unit) => (
                          <option key={unit.Code} value={unit.Code}>
                            {unit.Code} - {unit.Name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={selectedProduct.UnitOfMeasureCode || '-'} 
                        readOnly
                        className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Produktgruppe</label>
                    {isEditing && productGroups.length > 0 ? (
                      <select
                        value={editedProduct?.ProductGroupId || ''}
                        onChange={(e) => handleProductFieldChange('ProductGroupId', parseInt(e.target.value))}
                        className="mt-1 w-full px-4 py-2 bg-gray-600 text-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Velg produktgruppe...</option>
                        {productGroups.map((group: any) => (
                          <option key={group.Id} value={group.Id}>
                            {group.Code} - {group.Name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={selectedProduct.ProductGroupCode || '-'} 
                        readOnly
                        className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Status</label>
                    <div className="mt-1">
                      {!selectedProduct.IsArchived ? (
                        <span className="px-3 py-2 inline-flex text-sm font-semibold rounded-lg bg-green-100 text-green-800">
                          Aktiv
                        </span>
                      ) : (
                        <span className="px-3 py-2 inline-flex text-sm font-semibold rounded-lg bg-gray-100 text-gray-800">
                          Arkivert
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedProduct.IsStockItem && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Lager tilgjengelig</label>
                        <input 
                          type="text" 
                          value={selectedProduct.StockAvailable || '0'} 
                          readOnly
                          className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-400">Lager på hånd</label>
                        <input 
                          type="text" 
                          value={selectedProduct.StockOnHand || '0'} 
                          readOnly
                          className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400">Beskrivelse</label>
                  <textarea 
                    value={isEditing ? (editedProduct?.Description || '') : (selectedProduct.Description || '')} 
                    onChange={(e) => isEditing && handleProductFieldChange('Description', e.target.value)}
                    readOnly={!isEditing}
                    rows={4}
                    className={`mt-1 w-full px-4 py-2 text-white border rounded-lg ${
                      isEditing 
                        ? 'bg-gray-600 border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none' 
                        : 'bg-gray-700 border-gray-600'
                    }`}
                  />
                </div>

                {isEditing && (
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="isStockItem"
                      checked={editedProduct?.IsStockItem || false}
                      onChange={(e) => handleProductFieldChange('IsStockItem', e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isStockItem" className="text-sm font-medium text-gray-400">
                      Lagervare (Inventory Item)
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Standard Sales Account</label>
                    {isEditing ? (
                      <select
                        value={editedProduct?.StandardSalesAccountId || ''}
                        onChange={(e) => handleProductFieldChange('StandardSalesAccountId', parseInt(e.target.value) || null)}
                        className="mt-1 w-full px-4 py-2 bg-gray-600 text-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Velg konto...</option>
                        {SALES_ACCOUNTS.map((account) => (
                          <option key={account.Id} value={account.Id}>
                            {account.Code} - {account.Name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={selectedProduct.StandardSalesAccount ? `${selectedProduct.StandardSalesAccount.Code} - ${selectedProduct.StandardSalesAccount.Name}` : '-'} 
                        readOnly
                        className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Alternate Sales Account</label>
                    {isEditing ? (
                      <select
                        value={editedProduct?.OptionalSalesAccountId || ''}
                        onChange={(e) => handleProductFieldChange('OptionalSalesAccountId', parseInt(e.target.value) || null)}
                        className="mt-1 w-full px-4 py-2 bg-gray-600 text-white border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Velg konto...</option>
                        {SALES_ACCOUNTS.map((account) => (
                          <option key={account.Id} value={account.Id}>
                            {account.Code} - {account.Name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={selectedProduct.OptionalSalesAccount ? `${selectedProduct.OptionalSalesAccount.Code} - ${selectedProduct.OptionalSalesAccount.Name}` : '-'} 
                        readOnly
                        className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                      />
                    )}
                  </div>
                </div>

                {/* Raw JSON */}
                <div>
                  <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">
                    All Data (JSON)
                  </h3>
                  <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded border border-gray-600 overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedProduct, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-700 border-t border-gray-600 px-6 py-4 flex justify-between">
              <div>
                {!isEditing && selectedProduct.Id && (
                  <button
                    onClick={handleEditProduct}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Rediger
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (isEditing) {
                      handleCancelProductEdit();
                    } else {
                      setSelectedProduct(null);
                      setActiveTab('info');
                    }
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  {isEditing ? 'Avbryt' : 'Lukk'}
                </button>
                {isEditing && (
                  <button
                    onClick={handleSaveProduct}
                    disabled={saving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Lagrer...' : 'Lagre'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedInvoice(null);
          }}
        >
          <div 
            className="bg-gray-700 rounded-lg shadow-xl w-[1000px] h-[600px] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gray-700 px-6 py-4 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white">
                  Faktura {selectedInvoice.InvoiceNo}
                </h2>
                {selectedInvoice.Status === 0 && (
                  <span className="px-2 py-1 text-xs bg-yellow-500 text-gray-900 rounded font-medium">
                    Utkast
                  </span>
                )}
                {selectedInvoice.Status === 1 && (
                  <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded font-medium">
                    Sendt
                  </span>
                )}
                {selectedInvoice.Status === 2 && (
                  <span className="px-2 py-1 text-xs bg-green-500 text-white rounded font-medium">
                    Betalt
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Kunde</label>
                    <input 
                      type="text" 
                      value={selectedInvoice.CustomerName || '-'} 
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Fakturanummer</label>
                    <input 
                      type="text" 
                      value={selectedInvoice.InvoiceNo || '-'} 
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Fakturadato</label>
                    <input 
                      type="text" 
                      value={new Date(selectedInvoice.InvoiceDate).toLocaleDateString('nb-NO')} 
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Forfallsdato</label>
                    <input 
                      type="text" 
                      value={new Date(selectedInvoice.DueDate).toLocaleDateString('nb-NO')} 
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Totalbeløp</label>
                    <input 
                      type="text" 
                      value={`${selectedInvoice.TotalAmount?.toFixed(2)} kr`} 
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">MVA</label>
                    <input 
                      type="text" 
                      value={`${selectedInvoice.TotalVat?.toFixed(2)} kr`} 
                      readOnly
                      className="mt-1 w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                    />
                  </div>
                </div>

                {/* Invoice Lines */}
                {selectedInvoice.InvoiceLines && selectedInvoice.InvoiceLines.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">
                      Fakturalinjer
                    </h3>
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <table className="min-w-full">
                        <thead className="bg-gray-900">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Beskrivelse</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Antall</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Pris</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">Sum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {selectedInvoice.InvoiceLines.map((line: any, index: number) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-white">{line.Description}</td>
                              <td className="px-4 py-2 text-sm text-white text-right">{line.Quantity}</td>
                              <td className="px-4 py-2 text-sm text-white text-right">{line.UnitPrice?.toFixed(2)} kr</td>
                              <td className="px-4 py-2 text-sm text-white text-right">{line.LineAmount?.toFixed(2)} kr</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <div>
                  <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">
                    All Data (JSON)
                  </h3>
                  <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded border border-gray-600 overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedInvoice, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-700 border-t border-gray-600 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
