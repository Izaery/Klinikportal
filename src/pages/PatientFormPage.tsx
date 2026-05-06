import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, AlertCircle, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FormErrors {
  [key: string]: string;
}

const PatientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addPatient, updatePatient, patients } = usePatients();
  const { hasRole, hasAnyRole } = useAuth();
  
  const isIntake = hasRole('INTAKE') && !hasAnyRole(['ADMIN', 'MANAGER']);
  const isEditMode = !!id;
  const existingPatient = isEditMode ? patients.find(p => p.id === id) : undefined;

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
  const [auftrag, setAuftrag] = useState('');
  const [insurance, setInsurance] = useState('');
  const [admissionType, setAdmissionType] = useState<AdmissionType>('TEILSTATION');
  const [urgency, setUrgency] = useState<Urgency | ''>('elektiv');
  const [station, setStation] = useState<Station | ''>('');
  const [vollStation, setVollStation] = useState<VollStation | ''>('');
  const [secondaryStation, setSecondaryStation] = useState<VollStation | ''>('');
  const [mondayCall, setMondayCall] = useState<boolean | null>(null);
  const [preInterviewDate, setPreInterviewDate] = useState<Date | undefined>(new Date());
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>();

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing patient data for edit mode
  useEffect(() => {
    if (isEditMode && existingPatient) {
      setFirstName(existingPatient.firstName);
      setLastName(existingPatient.lastName);
      setBirthDate(existingPatient.birthDate);
      setGender(existingPatient.gender);
      setCaseNumber(existingPatient.caseNumber || '');
      setPhone(existingPatient.phone || '');
      setEmail(existingPatient.email || '');
      setCatchmentArea(existingPatient.catchmentArea);
      setDiagnosis(existingPatient.diagnosis);
      setExternalReferral(existingPatient.externalReferral);
      setSubstanceAbuse(existingPatient.substanceAbuse);
      setSubstanceAbuseDetails(existingPatient.substanceAbuseDetails || '');
      setRelevantConditions(existingPatient.relevantConditions);
      setRelevantConditionsDetails(existingPatient.relevantConditionsDetails || '');
      setNotes(existingPatient.notes || '');
      setAuftrag(existingPatient.auftrag || '');
      setInsurance(existingPatient.insurance || '');
      setAdmissionType(existingPatient.admissionType);
      setUrgency(existingPatient.urgency || '');
      setStation(existingPatient.station || '');
      setVollStation(existingPatient.vollStation || '');
      setSecondaryStation(existingPatient.secondaryStation || '');
      setMondayCall(
        typeof existingPatient.mondayCall === 'boolean' ? existingPatient.mondayCall : null
      );
      if (existingPatient.preInterviewDate) {
        setPreInterviewDate(new Date(existingPatient.preInterviewDate));
      }
      if (existingPatient.admissionDate) {
        setAdmissionDate(new Date(existingPatient.admissionDate));
      }
    }
  }, [isEditMode, existingPatient]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Pflichtfelder
    if (!firstName.trim()) newErrors.firstName = 'Vorname ist erforderlich';
    if (!lastName.trim()) newErrors.lastName = 'Nachname ist erforderlich';
    if (!birthDate) newErrors.birthDate = 'Geburtsdatum ist erforderlich';
    if (!diagnosis.trim()) newErrors.diagnosis = 'Diagnose ist erforderlich';

    // Vorgesprächstermin wird bei Teilstation nicht mehr im Formular abgefragt
    // (wird später in "Teilstation - Vorgespräche" vergeben)

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

    // Fallnummer - eindeutig wenn angegeben (ignoriere eigenen Patienten im Edit-Modus)
    if (caseNumber.trim()) {
      const exists = patients.some(p => p.caseNumber === caseNumber.trim() && p.id !== id);
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

    // Dringlichkeit ist immer Pflicht
    if (!urgency) {
      newErrors.urgency = 'Dringlichkeit ist erforderlich';
    }

    // Auftrag ist Pflicht bei Teilstation
    if (admissionType === 'TEILSTATION' && !auftrag.trim()) {
      newErrors.auftrag = 'Auftrag ist erforderlich bei Teilstation';
    }

    // Krankenkasse ist immer Pflicht
    if (!insurance.trim()) {
      newErrors.insurance = 'Krankenkasse ist erforderlich';
    }

    // Vollstation ist Pflicht bei Aufnahmeart Vollstation
    if (admissionType === 'VOLLSTATION' && !isIntake && !vollStation) {
      newErrors.vollStation = 'Station (Vollstation) ist erforderlich';
    }

    // Montagsanruf ist Pflicht bei Vollstation
    if (admissionType === 'VOLLSTATION' && mondayCall === null) {
      newErrors.mondayCall = 'Montagsanruf ist erforderlich';
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
      const patientData = {
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
        auftrag: admissionType === 'TEILSTATION' ? auftrag.trim() : undefined,
        insurance: insurance.trim(),
        admissionType,
        urgency: urgency as Urgency,
        station: admissionType === 'TEILSTATION' && !isIntake && station ? (station as Station) : undefined,
        vollStation: admissionType === 'VOLLSTATION' && !isIntake && vollStation ? (vollStation as VollStation) : undefined,
        secondaryStation: admissionType === 'VOLLSTATION' && !isIntake && secondaryStation ? (secondaryStation as VollStation) : undefined,
        mondayCall: admissionType === 'VOLLSTATION' ? (mondayCall ?? false) : undefined,
        preInterviewDate: isEditMode
          ? existingPatient?.preInterviewDate
          : admissionType === 'VOLLSTATION' && !isIntake
            ? new Date().toISOString()
            : undefined,
        admissionDate: admissionDate ? admissionDate.toISOString() : undefined,
      };

      if (isEditMode && id) {
        updatePatient(id, patientData);
        toast.success('Patient erfolgreich aktualisiert');
      } else {
        addPatient(patientData);
        toast.success('Patient erfolgreich angelegt');
      }
      navigate(-1);
    } catch {
      toast.error(isEditMode ? 'Fehler beim Aktualisieren des Patienten' : 'Fehler beim Anlegen des Patienten');
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputError: React.FC<{ error?: string }> = ({ error }) => {
    if (!error) return null;
    return <p className="text-sm text-destructive mt-1">{error}</p>;
  };

  // Minimum date for pre-interview (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {isEditMode ? 'Patient bearbeiten' : 'Patient anlegen'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode 
            ? `${existingPatient?.firstName} ${existingPatient?.lastName} bearbeiten` 
            : 'Erfassen Sie einen neuen Patienten'}
        </p>
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

            <div className="md:col-span-2">
              <Label htmlFor="insurance">Krankenkasse *</Label>
              <Input
                id="insurance"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                placeholder="z.B. AOK, TK, Barmer..."
                className={errors.insurance ? 'border-destructive' : ''}
              />
              <InputError error={errors.insurance} />
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
            {/* Patientenkontakt am - nur für Vollstation (bei Teilstation wird er später in "Vorgespräche" vergeben) */}
            {!isIntake && admissionType === 'VOLLSTATION' && (
              <div>
                <Label>Patientenkontakt am *</Label>
                <div className="w-full p-3 mt-2 rounded-md border border-input bg-muted text-muted-foreground">
                  <CalendarIcon className="mr-2 h-4 w-4 inline" />
                  {format(new Date(), "PPP", { locale: de })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bei Vollstation wird automatisch das heutige Datum verwendet
                </p>
              </div>
            )}

            <div>
              <Label>Aufnahmeart *</Label>
              <RadioGroup
                value={admissionType}
                onValueChange={(value) => {
                  setAdmissionType(value as AdmissionType);
                  if (value === 'VOLLSTATION') {
                    setStation('');
                  } else {
                    setVollStation('');
                    setSecondaryStation('');
                  }
                }}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="VOLLSTATION" id="admission-voll" disabled={isIntake} />
                  <Label htmlFor="admission-voll" className={cn("font-normal", isIntake && "text-muted-foreground")}>
                    Vollstation
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TEILSTATION" id="admission-teil" />
                  <Label htmlFor="admission-teil" className="font-normal">Teilstation</Label>
                </div>
              </RadioGroup>
              {isIntake && (
                <p className="text-xs text-muted-foreground mt-2">
                  Als Aufnahme-Mitarbeiter können Sie nur Teilstationen zuweisen
                </p>
              )}
            </div>

            {admissionType === 'VOLLSTATION' && (
              <div className="p-3 rounded-lg border border-border">
                <Label>Montagsanruf *</Label>
                <RadioGroup
                  value={mondayCall === null ? '' : mondayCall ? 'yes' : 'no'}
                  onValueChange={(value) => setMondayCall(value === 'yes')}
                  className="flex gap-6 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="mondayCall-yes" />
                    <Label htmlFor="mondayCall-yes" className="font-normal">Ja</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="mondayCall-no" />
                    <Label htmlFor="mondayCall-no" className="font-normal">Nein</Label>
                  </div>
                </RadioGroup>
                <InputError error={errors.mondayCall} />
              </div>
            )}

            {/* Dringlichkeit - für beide Aufnahmearten */}
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

            {admissionType === 'VOLLSTATION' && !isIntake && (
              <>
                <div>
                  <Label htmlFor="vollStation">Station (Vollstation) *</Label>
                  <Select 
                    value={vollStation || "none"} 
                    onValueChange={(value) => {
                      const newValue = value === "none" ? '' : value as VollStation;
                      setVollStation(newValue);
                      // Reset secondary station if it matches the new primary station
                      if (secondaryStation === newValue) {
                        setSecondaryStation('');
                      }
                    }}
                  >
                    <SelectTrigger className={errors.vollStation ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Station auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bitte wählen</SelectItem>
                      <SelectItem value="E">Station E</SelectItem>
                      <SelectItem value="F">Station F</SelectItem>
                      <SelectItem value="G">Station G</SelectItem>
                    </SelectContent>
                  </Select>
                  <InputError error={errors.vollStation} />
                </div>

                <div>
                  <Label htmlFor="secondaryStation">Sekundäre Station</Label>
                  <Select 
                    value={secondaryStation || "none"} 
                    onValueChange={(value) => setSecondaryStation(value === "none" ? '' : value as VollStation)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Station auswählen (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keine Zuweisung</SelectItem>
                      {(['E', 'F', 'G'] as VollStation[])
                        .filter(s => s !== vollStation)
                        .map(s => (
                          <SelectItem key={s} value={s}>Station {s}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional - weitere Station auswählen
                  </p>
                </div>

              </>
            )}

            {/* Aufnahmedatum - im Bearbeitungsmodus für alle Aufnahmearten sichtbar */}
            {isEditMode && (
              <div>
                <Label>Aufnahmedatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !admissionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {admissionDate ? format(admissionDate, 'dd.MM.yyyy', { locale: de }) : 'Datum auswählen (optional)'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={admissionDate}
                      onSelect={setAdmissionDate}
                      locale={de}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional - geplantes Aufnahmedatum
                </p>
              </div>
            )}

            {admissionType === 'TEILSTATION' && (
              <>
                <div>
                  <Label htmlFor="auftrag">Auftrag *</Label>
                  <Textarea
                    id="auftrag"
                    value={auftrag}
                    onChange={(e) => setAuftrag(e.target.value)}
                    placeholder="Ziele des Aufenthalts..."
                    className={errors.auftrag ? 'border-destructive' : ''}
                  />
                  <InputError error={errors.auftrag} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Beschreiben Sie die Ziele des teilstationären Aufenthalts
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Bei Teilstation erfolgt die Stationszuweisung später über die Anfrageliste.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Wird gespeichert...' : (isEditMode ? 'Speichern' : 'Patient anlegen')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PatientFormPage;