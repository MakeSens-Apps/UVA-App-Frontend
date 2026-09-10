/**
 * B16 — PersonalInfoScreen (real implementation)
 *
 * Ported from: src/app/pages/profile/personal-info/personal-info.page.ts + .html + .scss
 * Classification: Rewrite (UI layer)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - 2 forms (personal + location) with react-hook-form (foco via refs)
 *   - Parseo defensivo de uva.fields (string | object | throw)
 *   - validateInput() exacto: deleteConfirmationInput === 'ELIMINAR CUENTA'
 *   - modal_Delete (paso 1) → modal_Delete_2 (paso 2 con ELIMINAR CUENTA)
 *   - goDeleteAccount: UI completa; Auth.handleDeleteUser() llamado solo cuando isInputValid
 *   - Teléfono siempre disabled (readonly)
 *   - Footer pegajoso con "Editar datos" / "Guardar cambios"
 *   - latitude + longitude en fila side-by-side (onLine: true)
 *
 * Changes from original:
 *   - ionViewWillEnter → useFocusEffect
 *   - FormBuilder + ReactiveFormsModule → react-hook-form
 *   - AlertController → Alert.alert (RN)
 *   - ion-modal bottom sheets → UvaBottomSheet
 *   - ChangeDetectorRef → setState
 *
 * Visual parity (docs/evidence/profile/README.md screen-04 to screen-08):
 *   - Secciones con label azul teal pequeño (Datos personales / Datos de ubicación / Otras acciones)
 *   - Inputs: readonly = fondo gris; editable = borde azul teal (#10BCCA)
 *   - Eliminar cuenta: texto rojo + icono papelera
 *   - Modal inversión: "Sí, quiero eliminarla" (outline naranja) / "No, no quiero eliminarla" (sólido naranja)
 *
 * SEGURIDAD: NO ejecutar goDeleteAccount real en el emulador.
 *            El integrador valida el flujo de UI hasta paso 2 pero NO confirma el borrado.
 */

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '@/components/header';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

import { UvaBottomSheet } from '@/components/ui/BottomSheet';
import type { BottomSheetRef } from '@/components/ui/BottomSheet';
import { showToast } from '@/components/ui/Toast';

import { UserDSService } from '@/data/datastore/user-ds';
import { UvaDSService } from '@/data/datastore/uva-ds';
import { authService } from '@/data/auth/auth';

import { useNavigationGate } from '@/navigation/useNavigationGate';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── SVG icons ────────────────────────────────────────────────────────────────
// NOTE: react-native-svg-transformer requires SVG imports as React components,
// NOT as Image source via require().
import TrashIcon from '@/assets/svg/icons/profile/trash.svg';
import PencilIcon from '@/assets/svg/icons/profile/pencil.svg';

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AppStackParamList, 'PersonalInfo'>;

// ─── Form types ────────────────────────────────────────────────────────────────

interface PersonalForm {
  userName: string;
  userLastName: string;
  userPhoneNumber: string;
  userEmail: string;
}

interface LocationForm {
  finca: string;
  vereda: string;
  municipio: string;
  latitude: string;
  longitude: string;
  altitude: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PersonalInfoScreen({ navigation }: Props): React.JSX.Element {
  // Edge-to-edge (targetSdk 36): the sticky footer sits at the window bottom, i.e.
  // UNDER the Android system nav bar — "Editar datos" was half hidden (device D5/D-03).
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { goToAuth } = useNavigationGate();

  const [isEditable, setIsEditable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Per-field focus tracking — mirrors original handleFocus/handleBlur (personal-info.page.ts:296-323)
  // Original applied/removed 'focused' CSS class (border-color:#10BCCA) via DOM manipulation.
  // RN equivalent: track focused field key and apply borderColor per-field.
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Delete account state
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isInputValid, setIsInputValid] = useState(false);

  const deleteModalRef = useRef<BottomSheetRef>(null);
  const deleteModal2Ref = useRef<BottomSheetRef>(null);

  // ─── Forms ────────────────────────────────────────────────────────────────

  const personalForm = useForm<PersonalForm>({
    defaultValues: {
      userName: '',
      userLastName: '',
      userPhoneNumber: '',
      userEmail: '',
    },
  });

  const locationForm = useForm<LocationForm>({
    defaultValues: {
      finca: '',
      vereda: '',
      municipio: '',
      latitude: '',
      longitude: '',
      altitude: '',
    },
  });

  // Refs for focus (foco por refs, original: setTimeout + document.querySelector)
  // Note: lat/long/alt refs are used; name/email/finca/vereda/municipio fields
  // are focused via Controller's onSubmitEditing without explicit refs.
  const latRef = useRef<TextInput>(null);
  const longRef = useRef<TextInput>(null);
  const altRef = useRef<TextInput>(null);

  // ─── Load data on focus ────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        try {
          const [user, uva] = await Promise.all([
            UserDSService.getUser(),
            UvaDSService.getUVAByID(),
          ]);

          personalForm.reset({
            userName: user?.Name ?? '',
            userLastName: user?.LastName ?? '',
            userPhoneNumber: user?.PhoneNumber ?? '',
            userEmail: user?.Email ?? '',
          });

          // Parseo defensivo de uva.fields (portability-matrix §4.4)
          let fields: Record<string, string> = {};
          try {
            if (uva?.fields) {
              fields =
                typeof uva.fields === 'string'
                  ? (JSON.parse(uva.fields) as Record<string, string>)
                  : typeof uva.fields === 'object'
                    ? (uva.fields as Record<string, string>)
                    : (() => {
                        throw new Error('Formato no válido para uva.fields');
                      })();
            } else {
              console.warn('uva.fields está vacío o no definido.');
            }
          } catch (parseErr) {
            console.error('Error procesando uva.fields:', parseErr);
          }

          locationForm.reset({
            finca: fields['farmName'] ?? '',
            vereda: fields['villageName'] ?? '',
            municipio: fields['townName'] ?? '',
            latitude: uva?.latitude ?? '',
            longitude: uva?.longitude ?? '',
            altitude: uva?.altitude ?? '',
          });
        } catch (err) {
          console.error('PersonalInfoScreen load error:', err);
        }
      })();
    }, [personalForm, locationForm]),
  );

  // ─── Validate delete input (exact match) ──────────────────────────────────

  const validateInput = useCallback((value: string) => {
    setDeleteConfirmationInput(value);
    setIsInputValid(value === 'ELIMINAR CUENTA');
  }, []);

  // ─── Submit forms ──────────────────────────────────────────────────────────

  /**
   * Guarda ambos formularios.
   * @returns {Promise<boolean>} true si el guardado terminó bien; false si algo
   *   falló (formulario inválido o rechazo de DataStore).
   *
   * MEJORA MÍNIMA sobre el original: personal-info.page.ts:225-250 lanza
   * `void UserDSService.updateUser(...)` / `void UvaDSService.updateUVA(...)`
   * sin await ni feedback — un rechazo del backend se perdía en silencio y la
   * pantalla volvía a modo lectura como si hubiera guardado. Aquí se mantiene el
   * alert de validación literal del original y se añade un toast de error para
   * los rechazos (los mismos que produjeron el bug de uvaID en el device).
   */
  const onSubmit = useCallback(async (): Promise<boolean> => {
    const pValid = await personalForm.trigger();
    const lValid = await locationForm.trigger();
    if (pValid && lValid) {
      const pValues = personalForm.getValues();
      const lValues = locationForm.getValues();
      try {
        await UserDSService.updateUser({
          name: pValues.userName,
          lastName: pValues.userLastName,
          // Original parity (personal-info.page.ts:185,232): the form value is
          // `user?.Email || undefined`, so an empty email is sent as undefined.
          // The RN form keeps '' so the TextInput stays controlled, which made us
          // send Email: '' → DataStore rejects it ("Field Email should be of type
          // AWSEmail") and the whole save (name + lastName too) is lost for users
          // without an email. Normalize back to undefined here.
          email: pValues.userEmail || undefined,
        });
        const fields: Record<string, string> = {
          farmName: lValues.finca ?? '',
          villageName: lValues.vereda ?? '',
          townName: lValues.municipio ?? '',
        };
        await UvaDSService.updateUVA({
          latitude: lValues.latitude,
          longitude: lValues.longitude,
          altitud: lValues.altitude,
          fields: JSON.stringify(fields),
        });
        return true;
      } catch (saveErr) {
        console.error('Error saving personal info:', saveErr);
        showToast({
          message: 'No se pudieron guardar los cambios. Intenta de nuevo.',
          type: 'error',
        });
        return false;
      }
    } else {
      Alert.alert('Error', 'Para guardar todos los datos deben ser completados.');
      return false;
    }
  }, [personalForm, locationForm]);

  // ─── Toggle edit ──────────────────────────────────────────────────────────

  const toggleEdit = useCallback(() => {
    if (isEditable) {
      // Sólo se sale de modo edición si el guardado terminó bien: antes se
      // volvía a modo lectura aunque `updateUser` rechazara, dando la falsa
      // impresión de haber guardado.
      void onSubmit().then((ok) => {
        if (ok) setIsEditable(false);
      });
      return;
    }
    setIsEditable(true);
  }, [isEditable, onSubmit]);

  // ─── Delete account flow ──────────────────────────────────────────────────

  const goDeleteAccount = useCallback(async () => {
    if (!isInputValid || isLoading) return;
    setIsLoading(true);
    try {
      // NOTE: integrador NO confirma este borrado real (ver SEGURIDAD en header)
      const ok = await authService.handleDeleteUser?.();
      if (ok) {
        deleteModal2Ref.current?.dismiss();
        // Flip the gate back to the Auth stack (the Auth stack is not mounted
        // while in App, so a reset to { name: 'Auth' } would be a no-op).
        goToAuth();
      } else {
        Alert.alert('Error', 'No se pudo borrar la cuenta');
      }
    } catch (err) {
      console.error('Delete account error:', err);
      Alert.alert('Error', 'No se pudo borrar la cuenta');
    } finally {
      setIsLoading(false);
    }
  }, [isInputValid, isLoading, goToAuth]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // personal-info.page.scss ion-item: background #E5E5E5 read-only, white while focused.
  // gray[100] (#F5F5F5) made the field indistinguishable from the gray form card.
  const fieldBg = isEditable ? theme.colors.white : theme.colors.gray[200];

  /**
   * Returns the border color for a given field key.
   * Mirrors original handleFocus/handleBlur (personal-info.page.ts:296-323):
   * when focused → border-color: #10BCCA; otherwise use edit-state default.
   */
  const getFieldBorderColor = useCallback(
    (fieldKey: string, disabled?: boolean): string => {
      if (disabled) return theme.colors.gray[200];
      if (isEditable && focusedField === fieldKey) return theme.colors.blue[500];
      return isEditable ? theme.colors.gray[300] : theme.colors.gray[200];
    },
    [isEditable, focusedField, theme.colors],
  );

  // ─── Section label style ──────────────────────────────────────────────────

  const sectionLabelStyle = [
    styles.sectionLabel,
    {
      color: theme.colors.blue[600],
      fontFamily: fontFamilyForWeight('600'),
    },
  ];

  return (
    <View style={styles.root}>
      {/* Header — shared Header: status-bar inset + arrow-back-outline. Back + title
          only ⇒ the title sits at the right edge, like docs/evidence/profile/screen-04
          (device D-02 / D-18). */}
      <Header
        title="Información personal"
        hasBackButton
        hasProfileButton={false}
        onBackPress={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={[styles.scrollContent, { backgroundColor: theme.colors.white }]}
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Profile card */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.profileHeader}>
              <Image
                source={require('@/assets/png/user-circle.png')}
                style={styles.avatar}
                testID="personal-info-avatar"
              />
            </View>

            {/* Datos personales section — the fields live inside a gray card:
                personal-info.page.scss `form { padding:10px; border:1px solid
                var(--Colors-Gray-100); background: var(--Colors-Gray-100);
                border-radius:8px }` (docs/evidence/profile/screen-04). */}
            <Text style={sectionLabelStyle}>Datos personales</Text>
            <View style={styles.formGroup}>
            {([
              { key: 'userName' as const, label: 'Nombres', placeholder: '[Nombres del monitor]', disabled: false },
              { key: 'userLastName' as const, label: 'Apellidos', placeholder: '[Apellidos del monitor]', disabled: false },
              { key: 'userPhoneNumber' as const, label: 'Teléfono', placeholder: '#Celular', disabled: true },
              { key: 'userEmail' as const, label: 'Email', placeholder: 'correo@example.com', disabled: false },
            ] as const).map((field) => (
              <View key={field.key} style={styles.fieldWrapper}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: fontFamilyForWeight('500') },
                  ]}
                >
                  {field.label}
                </Text>
                <Controller
                  control={personalForm.control}
                  name={field.key}
                  render={({ field: f }) => (
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: field.disabled ? theme.colors.gray[100] : fieldBg,
                          borderColor: getFieldBorderColor(field.key, field.disabled),
                        },
                      ]}
                    >
                      <TextInput
                        style={[
                          styles.input,
                          { fontFamily: fontFamilyForWeight('400'), color: theme.colors.gray[700] },
                        ]}
                        value={f.value}
                        onChangeText={f.onChange}
                        onFocus={() => setFocusedField(field.key)}
                        onBlur={() => setFocusedField(null)}
                        placeholder={field.placeholder}
                        placeholderTextColor={theme.colors.gray[400]}
                        editable={!field.disabled && isEditable}
                        autoCapitalize="none"
                        testID={`input-${field.key}`}
                      />
                    </View>
                  )}
                />
              </View>
            ))}

            </View>

            {/* Datos de ubicación section */}
            <Text style={sectionLabelStyle}>Datos de ubicación</Text>
            <View style={styles.formGroup}>
            {([
              { key: 'finca' as const, label: 'Nombre de la finca', placeholder: '[Nombre de la finca]' },
              { key: 'vereda' as const, label: 'Nombre de la vereda', placeholder: '[Nombre de la vereda]' },
              { key: 'municipio' as const, label: 'Nombre del municipio', placeholder: '[Nombre del municipio]' },
            ] as const).map((field) => (
              <View key={field.key} style={styles.fieldWrapper}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: fontFamilyForWeight('500') },
                  ]}
                >
                  {field.label}
                </Text>
                <Controller
                  control={locationForm.control}
                  name={field.key}
                  render={({ field: f }) => (
                    <View
                      style={[
                        styles.inputContainer,
                        { backgroundColor: fieldBg, borderColor: getFieldBorderColor(field.key) },
                      ]}
                    >
                      <TextInput
                        style={[
                          styles.input,
                          { fontFamily: fontFamilyForWeight('400'), color: theme.colors.gray[700] },
                        ]}
                        value={f.value}
                        onChangeText={f.onChange}
                        onFocus={() => setFocusedField(field.key)}
                        onBlur={() => setFocusedField(null)}
                        placeholder={field.placeholder}
                        placeholderTextColor={theme.colors.gray[400]}
                        editable={isEditable}
                        testID={`input-${field.key}`}
                      />
                    </View>
                  )}
                />
              </View>
            ))}

            {/* Latitud + Longitud side-by-side (onLine: true) */}
            <View style={styles.inlineRow}>
              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: fontFamilyForWeight('500') },
                  ]}
                >
                  Latitud
                </Text>
                <Controller
                  control={locationForm.control}
                  name="latitude"
                  render={({ field: f }) => (
                    <View
                      style={[
                        styles.inputContainer,
                        { backgroundColor: fieldBg, borderColor: getFieldBorderColor('latitude') },
                      ]}
                    >
                      <TextInput
                        ref={latRef}
                        style={[
                          styles.input,
                          { fontFamily: fontFamilyForWeight('400'), color: theme.colors.gray[700] },
                        ]}
                        value={f.value}
                        onChangeText={f.onChange}
                        onFocus={() => setFocusedField('latitude')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="70° 55' 30&quot;"
                        placeholderTextColor={theme.colors.gray[400]}
                        editable={isEditable}
                        testID="input-latitude"
                      />
                    </View>
                  )}
                />
              </View>
              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: fontFamilyForWeight('500') },
                  ]}
                >
                  Longitud
                </Text>
                <Controller
                  control={locationForm.control}
                  name="longitude"
                  render={({ field: f }) => (
                    <View
                      style={[
                        styles.inputContainer,
                        { backgroundColor: fieldBg, borderColor: getFieldBorderColor('longitude') },
                      ]}
                    >
                      <TextInput
                        ref={longRef}
                        style={[
                          styles.input,
                          { fontFamily: fontFamilyForWeight('400'), color: theme.colors.gray[700] },
                        ]}
                        value={f.value}
                        onChangeText={f.onChange}
                        onFocus={() => setFocusedField('longitude')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="90°"
                        placeholderTextColor={theme.colors.gray[400]}
                        editable={isEditable}
                        testID="input-longitude"
                      />
                    </View>
                  )}
                />
              </View>
            </View>

            {/* Altitud */}
            <View style={styles.fieldWrapper}>
              <Text
                style={[
                  styles.fieldLabel,
                  { fontFamily: fontFamilyForWeight('500') },
                ]}
              >
                Altitud
              </Text>
              <Controller
                control={locationForm.control}
                name="altitude"
                render={({ field: f }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      { backgroundColor: fieldBg, borderColor: getFieldBorderColor('altitude') },
                    ]}
                  >
                    <TextInput
                      ref={altRef}
                      style={[
                        styles.input,
                        { fontFamily: fontFamilyForWeight('400'), color: theme.colors.gray[700] },
                      ]}
                      value={f.value}
                      onChangeText={f.onChange}
                      onFocus={() => setFocusedField('altitude')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="850 m"
                      placeholderTextColor={theme.colors.gray[400]}
                      editable={isEditable}
                      testID="input-altitude"
                    />
                  </View>
                )}
              />
            </View>

            </View>

            {/* Otras acciones section — personal-info.page.html:106 uses
                `.form-title.color-n` = #404040 (gray), NOT orange (device 166-239). */}
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: theme.colors.gray[700],
                  fontFamily: fontFamilyForWeight('600'),
                },
              ]}
            >
              Otras acciones
            </Text>
            <TouchableOpacity
              style={styles.deleteLink}
              onPress={() => deleteModalRef.current?.present()}
              testID="delete-account-btn"
            >
              <Text
                style={[
                  styles.deleteLinkText,
                  { fontFamily: fontFamilyForWeight('500') },
                ]}
              >
                Eliminar la cuenta
              </Text>
              <TrashIcon width={18} height={18} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>

          {/* Spacer for the sticky footer (+ system nav bar) */}
          <View style={{ height: 80 + insets.bottom }} />
        </ScrollView>

        {/* Sticky footer — "Editar datos" / "Guardar cambios" */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.white,
              borderTopColor: theme.colors.gray[200],
              paddingBottom: styles.footer.padding + insets.bottom,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.editButton,
              { backgroundColor: theme.colors.blue[600] },
            ]}
            onPress={toggleEdit}
            testID="toggle-edit-btn"
          >
            <Text
              style={[
                styles.editButtonText,
                { fontFamily: fontFamilyForWeight('600') },
              ]}
            >
              {isEditable ? 'Guardar cambios' : 'Editar datos'}
            </Text>
            <PencilIcon width={16} height={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom sheet — modal_Delete (paso 1). Sin snapPoints: alto por contenido
          (personal-info.page.html:137 → ion-modal --height:auto). */}
      <UvaBottomSheet
        ref={deleteModalRef}
        enablePanDownToClose
      >
        <View style={styles.deleteModal}>
          <View style={styles.deleteCard}>
            <Text
              style={[
                styles.deleteBodyText,
                { fontFamily: fontFamilyForWeight('400') },
              ]}
            >
              Al{' '}
              <Text style={styles.strongText}>eliminar</Text>
              {' '}tu cuenta{' '}
              <Text style={styles.strongText}>perderás</Text>
              {' '}todos tus{' '}
              <Text style={styles.strongText}>datos registrados</Text>
              {' '}hasta el momento, sin embargo, estos datos se mantendrán en
              nuestra base de datos.
            </Text>
          </View>
          <View style={styles.deleteCard}>
            <Text
              style={[
                styles.deleteQuestionText,
                { fontFamily: fontFamilyForWeight('600') },
              ]}
            >
              ¿Quieres eliminar tu cuenta?
            </Text>
          </View>
          {/* Inversión de botones: "Sí" (outline) / "No" (sólido naranja) */}
          <View style={styles.deleteButtons}>
            <TouchableOpacity
              style={[
                styles.deleteOutlineBtn,
                { borderColor: theme.colors.orange[500] },
              ]}
              onPress={() => {
                deleteModalRef.current?.dismiss();
                setTimeout(() => deleteModal2Ref.current?.present(), 300);
              }}
              testID="confirm-delete-step1"
            >
              <Text
                style={[
                  styles.deleteOutlineBtnText,
                  {
                    color: theme.colors.orange[500],
                    fontFamily: fontFamilyForWeight('500'),
                  },
                ]}
                numberOfLines={2}
                textBreakStrategy="simple"
              >
                Sí, quiero eliminarla
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteSolidBtn,
                { backgroundColor: theme.colors.orange[500] },
              ]}
              onPress={() => deleteModalRef.current?.dismiss()}
              testID="cancel-delete-step1"
            >
              <Text
                style={[
                  styles.deleteSolidBtnText,
                  { fontFamily: fontFamilyForWeight('500') },
                ]}
                numberOfLines={2}
                textBreakStrategy="simple"
              >
                No, no quiero eliminarla
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </UvaBottomSheet>

      {/* Bottom sheet — modal_Delete_2 (paso 2: escribir ELIMINAR CUENTA) */}
      <UvaBottomSheet
        ref={deleteModal2Ref}
        enablePanDownToClose
      >
        <View style={styles.deleteModal}>
          <View style={styles.deleteCard}>
            <Text
              style={[
                styles.deleteBodyText,
                { fontFamily: fontFamilyForWeight('400') },
              ]}
            >
              Para <Text style={styles.strongText}>eliminar</Text> tu cuenta
              por favor{'\n'}escribe en mayusculas:{'\n'}
              <Text style={styles.strongText}>ELIMINAR CUENTA</Text>
            </Text>
          </View>
          <View style={styles.deleteCard}>
            <TextInput
              style={[
                styles.deleteInput,
                {
                  fontFamily: fontFamilyForWeight('400'),
                  borderColor: isInputValid ? theme.colors.blue[500] : theme.colors.gray[300],
                },
              ]}
              value={deleteConfirmationInput}
              onChangeText={validateInput}
              placeholder="ELIMINAR CUENTA"
              placeholderTextColor={theme.colors.gray[400]}
              autoCapitalize="characters"
              testID="delete-confirmation-input"
            />
          </View>
          <View style={styles.deleteButtons}>
            <TouchableOpacity
              style={[
                styles.deleteOutlineBtn,
                { borderColor: theme.colors.orange[500] },
              ]}
              onPress={() => {
                deleteModal2Ref.current?.dismiss();
                setDeleteConfirmationInput('');
                setIsInputValid(false);
              }}
              testID="cancel-delete-step2"
            >
              <Text
                style={[
                  styles.deleteOutlineBtnText,
                  {
                    color: theme.colors.orange[500],
                    fontFamily: fontFamilyForWeight('500'),
                  },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteSolidBtn,
                {
                  backgroundColor: isInputValid
                    ? theme.colors.orange[500]
                    : theme.colors.gray[300],
                },
              ]}
              onPress={() => void goDeleteAccount()}
              disabled={!isInputValid || isLoading}
              testID="confirm-delete-step2"
            >
              <Text
                style={[
                  styles.deleteSolidBtnText,
                  { fontFamily: fontFamilyForWeight('500') },
                ]}
              >
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </UvaBottomSheet>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  headerBtn: { padding: 4, minWidth: 36, alignItems: 'center' },
  backIcon: { transform: [{ scaleX: -1 }] },
  headerTitle: {
    fontSize: 18,
    color: '#FAFAFA',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: { flex: 1 },
  scrollInner: { padding: 10, paddingBottom: 16 },
  // .profile-card (personal-info.page.scss:30-37): radius only — NO white panel and
  // NO border; the page itself is white and the forms are the gray cards.
  profileCard: {
    borderRadius: 16,
    padding: 10,
    gap: 16,
  },
  // <form> (personal-info.page.scss:105-110)
  formGroup: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    gap: 16,
  },
  profileHeader: { alignItems: 'center', paddingVertical: 8 },
  avatar: { width: 95, height: 95, borderRadius: 47.5 },
  sectionLabel: { fontSize: 12, marginTop: 4 },
  fieldWrapper: { gap: 4 },
  fieldLabel: { fontSize: 13, color: '#404040' },
  inputContainer: {
    borderWidth: 1,
    // ion-item: height 48, border-radius 10 (personal-info.page.scss:140-144)
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  input: { fontSize: 14, padding: 0 },
  inlineRow: { flexDirection: 'row', gap: 12 },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // .delete-button ion-label color: #CA514A (personal-info.page.scss:206)
  deleteLinkText: { fontSize: 14, color: '#CA514A' },
  trashIcon: { width: 18, height: 18 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderTopWidth: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  editButtonText: { fontSize: 14, color: '#FFFFFF' },
  editIcon: { width: 18, height: 18, tintColor: '#FFFFFF' },
  // Delete modal
  deleteModal: { padding: 10, gap: 12, paddingBottom: 20 },
  deleteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  deleteBodyText: { fontSize: 14, color: '#164551', lineHeight: 22 },
  strongText: { fontFamily: 'Montserrat-SemiBold' },
  deleteQuestionText: { fontSize: 16, color: '#164551', textAlign: 'center' },
  deleteButtons: { flexDirection: 'row', gap: 10 },
  deleteOutlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteOutlineBtnText: { fontSize: 13 },
  deleteSolidBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteSolidBtnText: { fontSize: 13, color: '#FFFFFF' },
  deleteInput: {
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#404040',
    letterSpacing: 1,
  },
});

export default PersonalInfoScreen;
