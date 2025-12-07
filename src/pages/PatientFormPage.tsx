import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle } from 'lucide-react';
import { usePatients } from '@/contexts/PatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { AdmissionType, Gender, Urgency, Station, VollStation } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface FormErrors {
  [key: string]: string;
}

const PatientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { addPatient, patients } = usePatients();
  const { hasRole, hasAnyRole } = useAuth();
  
  const isIntake = hasRole('INTAKE') && !hasAnyRole(['ADMIN', 'MANAGER']);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('m');
  const [caseNumber, setCaseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [catchmentArea, setCatchmentArea] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [externalReferral, setExternalReferral] = useState(false);
  const [substanceAbuse, setSubstanceAbuse] = useState(false);
  const [substanceAbuseDetails, setSubstanceAbuseDetails] = useState('');
  const [relevantConditions, setRelevantConditions] = useState(false);
  const [relevantConditionsDetails, setRelevantConditionsDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [admissionType, setAdmissionType] = useState<AdmissionType>('TEILSTATION');
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [station, setStation] = useState<Station | ''>('');
  const [vollStation, setVollStation] = useState<VollStation | ''>('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Pflichtfelder
    if (!firstName.trim()) newErrors.firstName = 'Vorname ist erforderlich';
    if (!lastName.trim()) newErrors.lastName = 'Nachname ist erforderlich';
    if (!birthDate) newErrors.birthDate = 'Geburtsdatum ist erforderlich';
    if (!diagnosis.trim()) newErrors.diagnosis = 'Diagnose ist erforderlich';

    // Geburtsdatum Validierung
    if (birthDate) {
      const date = new Date(birthDate);
      const minDate = new Date('1900-01-01');
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (date < minDate) {
        newErrors.birthDate = 'Geburtsdatum darf nicht vor 1900 liegen';
      } else if (date > today) {
        newErrors.birthDate = 'Geburtsdatum darf nicht in der Zukunft liegen';
      }
    }

    // Kontakt - mindestens eins erforderlich
    if (!phone.trim() && !email.trim()) {
      newErrors.contact = 'Mindestens Telefon oder E-Mail ist erforderlich';
    }

    // Fallnummer - eindeutig wenn angegeben
    if (caseNumber.trim()) {
      const exists = patients.some(p => p.caseNumber === caseNumber.trim());
      if (exists) {
        newErrors.caseNumber = 'Diese Fallnummer existiert bereits';
      }
    }

    // Suchtmittelabhängigkeit Details
    if (substanceAbuse && !substanceAbuseDetails.trim()) {
      newErrors.substanceAbuseDetails = 'Bitte Details zur Suchtmittelabhängigkeit angeben';
    }

    // Relevante Erkrankungen Details
    if (relevantConditions && !relevantConditionsDetails.trim()) {
      newErrors.relevantConditionsDetails = 'Bitte Details zu relevanten Erkrankungen angeben';
    }

    // Dringlichkeit bei Teilstation
    if (admissionType === 'TEILSTATION' && !urgency) {
      newErrors.urgency = 'Dringlichkeit ist bei Teilstation erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Bitte korrigieren Sie die markierten Fehler');
      return;
    }

    setIsSubmitting(true);

    try {
      addPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        gender,
        caseNumber: caseNumber.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        catchmentArea,
        diagnosis: diagnosis.trim(),
        externalReferral,
        substanceAbuse,
        substanceAbuseDetails: substanceAbuse ? substanceAbuseDetails.trim() : undefined,
        relevantConditions,
        relevantConditionsDetails: relevantConditions ? relevantConditionsDetails.trim() : undefined,
        notes: notes.trim() || undefined,
        admissionType,
        urgency: admissionType === 'TEILSTATION' ? (urgency as Urgency) : undefined,
        station: admissionType === 'TEILSTATION' && !isIntake && station ? (station as Station) : undefined,
        vollStation: admissionType === 'VOLLSTATION' && vollStation ? (vollStation as VollStation) : undefined,
      });

      toast.success('Patient erfolgreich angelegt');
      navigate('/dashboard');
    } catch {
      toast.error('Fehler beim Anlegen des Patienten');
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputError: React.FC<{ error?: string }> = ({ error }) => {
    if (!error) return null;
    return <p className="text-sm text-destructive mt-1">{error}</p>;
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Patient anlegen</h1>
        <p className="text-muted-foreground mt-1">Erfassen Sie einen neuen Patienten</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stammdaten */}
        <div className="form-section">
          <h2 className="form-section-title">Stammdaten</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Vorname *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={errors.firstName ? 'border-destructive' : ''}
              />
              <InputError error={errors.firstName} />
            </div>

            <div>
              <Label htmlFor="lastName">Nachname *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={errors.lastName ? 'border-destructive' : ''}
              />
              <InputError error={errors.lastName} />
            </div>

            <div>
              <Label htmlFor="birthDate">Geburtsdatum *</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                min="1900-01-01"
                className={errors.birthDate ? 'border-destructive' : ''}
              />
              <InputError error={errors.birthDate} />
            </div>

            <div>
              <Label htmlFor="caseNumber">Fallnummer</Label>
              <Input
                id="caseNumber"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="Optional"
                className={errors.caseNumber ? 'border-destructive' : ''}
              />
              <InputError error={errors.caseNumber} />
            </div>
          </div>

          <div className="mt-4">
            <Label>Geschlecht *</Label>
            <RadioGroup
              value={gender}
              onValueChange={(value) => setGender(value as Gender)}
              className="flex gap-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="m" id="gender-m" />
                <Label htmlFor="gender-m" className="font-normal">männlich</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="w" id="gender-w" />
                <Label htmlFor="gender-w" className="font-normal">weiblich</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="d" id="gender-d" />
                <Label htmlFor="gender-d" className="font-normal">divers</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Kontakt */}
        <div className="form-section">
          <h2 className="form-section-title">Kontakt</h2>
          
          {errors.contact && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.contact}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="z.B. 0171-1234567"
              />
            </div>

            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="beispiel@email.de"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Mindestens eine Kontaktmöglichkeit erforderlich
          </p>
        </div>

        {/* Medizinische Daten */}
        <div className="form-section">
          <h2 className="form-section-title">Medizinische Daten</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="diagnosis">Diagnose *</Label>
              <Textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Mögliche Diagnose"
                className={errors.diagnosis ? 'border-destructive' : ''}
              />
              <InputError error={errors.diagnosis} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <Label htmlFor="catchmentArea" className="font-normal cursor-pointer">
                  Einzugsgebiet
                </Label>
                <Switch
                  id="catchmentArea"
                  checked={catchmentArea}
                  onCheckedChange={setCatchmentArea}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <Label htmlFor="externalReferral" className="font-normal cursor-pointer">
                  Externe Einweisung
                </Label>
                <Switch
                  id="externalReferral"
                  checked={externalReferral}
                  onCheckedChange={setExternalReferral}
                />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="substanceAbuse" className="font-normal cursor-pointer">
                  Suchtmittelabhängigkeit
                </Label>
                <Switch
                  id="substanceAbuse"
                  checked={substanceAbuse}
                  onCheckedChange={setSubstanceAbuse}
                />
              </div>
              {substanceAbuse && (
                <div>
                  <Label htmlFor="substanceAbuseDetails">Welche Suchtmittel? *</Label>
                  <Input
                    id="substanceAbuseDetails"
                    value={substanceAbuseDetails}
                    onChange={(e) => setSubstanceAbuseDetails(e.target.value)}
                    placeholder="z.B. Alkohol, Cannabis..."
                    className={errors.substanceAbuseDetails ? 'border-destructive' : ''}
                  />
                  <InputError error={errors.substanceAbuseDetails} />
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="relevantConditions" className="font-normal cursor-pointer">
                  Relevante Erkrankungen/Behinderungen
                </Label>
                <Switch
                  id="relevantConditions"
                  checked={relevantConditions}
                  onCheckedChange={setRelevantConditions}
                />
              </div>
              {relevantConditions && (
                <div>
                  <Label htmlFor="relevantConditionsDetails">Details *</Label>
                  <Textarea
                    id="relevantConditionsDetails"
                    value={relevantConditionsDetails}
                    onChange={(e) => setRelevantConditionsDetails(e.target.value)}
                    placeholder="Beschreibung der relevanten Erkrankungen..."
                    className={errors.relevantConditionsDetails ? 'border-destructive' : ''}
                  />
                  <InputError error={errors.relevantConditionsDetails} />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Anmerkungen</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Weitere Anmerkungen..."
              />
            </div>
          </div>
        </div>

        {/* Aufnahme */}
        <div className="form-section">
          <h2 className="form-section-title">Aufnahme</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Aufnahmeart *</Label>
              <RadioGroup
                value={admissionType}
                onValueChange={(value) => {
                  setAdmissionType(value as AdmissionType);
                  if (value === 'VOLLSTATION') {
                    setStation('');
                    setUrgency('');
                  } else {
                    setVollStation('');
                  }
                }}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="VOLLSTATION" id="admission-voll" />
                  <Label htmlFor="admission-voll" className="font-normal">Vollstation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TEILSTATION" id="admission-teil" />
                  <Label htmlFor="admission-teil" className="font-normal">Teilstation</Label>
                </div>
              </RadioGroup>
            </div>

            {admissionType === 'VOLLSTATION' && (
              <div>
                <Label htmlFor="vollStation">Station (Vollstation)</Label>
                <Select value={vollStation || "none"} onValueChange={(value) => setVollStation(value === "none" ? '' : value as VollStation)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Station auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Zuweisung</SelectItem>
                    <SelectItem value="E">Station E</SelectItem>
                    <SelectItem value="F">Station F</SelectItem>
                    <SelectItem value="G">Station G</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional
                </p>
              </div>
            )}

            {admissionType === 'TEILSTATION' && (
              <>
                <div>
                  <Label>Dringlichkeit *</Label>
                  <RadioGroup
                    value={urgency}
                    onValueChange={(value) => setUrgency(value as Urgency)}
                    className="flex gap-6 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="elektiv" id="urgency-elektiv" />
                      <Label htmlFor="urgency-elektiv" className="font-normal">Elektiv</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dringend" id="urgency-dringend" />
                      <Label htmlFor="urgency-dringend" className="font-normal">Dringend</Label>
                    </div>
                  </RadioGroup>
                  <InputError error={errors.urgency} />
                </div>

                {!isIntake && (
                  <div>
                    <Label htmlFor="station">Station</Label>
                    <Select value={station || "none"} onValueChange={(value) => setStation(value === "none" ? '' : value as Station)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Station auswählen (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Zuweisung</SelectItem>
                        <SelectItem value="A">Station A</SelectItem>
                        <SelectItem value="B">Station B</SelectItem>
                        <SelectItem value="C">Station C</SelectItem>
                        <SelectItem value="D">Station D</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional - kann später zugewiesen werden
                    </p>
                  </div>
                )}

                {isIntake && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Als Aufnahme-Mitarbeiter können Sie keine Station zuweisen. Dies erfolgt später durch Ärzte oder Manager.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Wird gespeichert...' : 'Patient anlegen'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PatientFormPage;
