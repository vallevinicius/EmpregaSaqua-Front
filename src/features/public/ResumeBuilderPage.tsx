import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '@/auth/useAuth';
import { Button, Card, CardSectionTitle, Field, Input, PageHeader, Textarea, buttonClass } from '@/components/ui';
import { CepLookup, StringListInput, cepToAddress } from '@/components/inputs';
import { BriefcaseIcon, FileTextIcon, GraduationCapIcon, IdentificationCardIcon, SparkleIcon, TrashIcon } from '@/components/icons';
import { onlyDigits } from '@/lib/safe';
import { ResumePreview } from '@/features/candidate/ResumePreview';

/**
 * Criador de currículo público: funciona sem conta e sem back. Os dados ficam só neste navegador
 * (localStorage) e o PDF sai pela impressão do navegador ("Salvar como PDF"), com o mesmo layout da prévia.
 * Quem quiser se candidatar cria uma conta: o currículo com conta fica em /candidato/perfil.
 */
const month = z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM.');
const schema = z.object({
  full_name: z.string().trim().max(150),
  email: z.union([z.literal(''), z.email('E-mail inválido.').max(254)]),
  telefone: z.string().trim().refine((v) => v === '' || /^\d{10,13}$/.test(onlyDigits(v)), 'Telefone com DDD (10 a 13 dígitos).'),
  address: z.string().trim().max(200),
  bio: z.string().trim().max(2000),
  skills: z.array(z.string().trim().min(1).max(50)).max(30),
  experiences: z
    .array(
      z.object({
        company: z.string().trim().max(150),
        role: z.string().trim().max(150),
        start_date: z.union([z.literal(''), month]),
        end_date: z.union([z.literal(''), month]).optional(),
        description: z.string().trim().max(2000),
      }),
    )
    .max(20),
  educations: z
    .array(
      z.object({
        institution: z.string().trim().max(150),
        degree: z.string().trim().max(150),
        field_of_study: z.string().trim().max(150),
        start_date: z.union([z.literal(''), month]),
        end_date: z.union([z.literal(''), month]).optional(),
      }),
    )
    .max(20),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = { full_name: '', email: '', telefone: '', address: '', bio: '', skills: [], experiences: [], educations: [] };
const KEY = 'es.resume-draft.v1';

function loadDraft(): Values {
  try {
    const parsed = schema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

export default function ResumeBuilderPage() {
  const session = useSession();
  const [draft] = useState(loadDraft);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: draft, mode: 'onChange' });
  const exps = useFieldArray({ control: form.control, name: 'experiences' });
  const edus = useFieldArray({ control: form.control, name: 'educations' });
  const v = useWatch({ control: form.control });
  const { errors } = form.formState;

  // Rascunho automático (só neste navegador).
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* armazenamento indisponível: segue sem rascunho */
    }
  }, [v]);

  const clear = () => {
    form.reset(EMPTY);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignora */
    }
  };

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Crie seu currículo"
          description="Preencha seus dados e o currículo é montado na hora. Baixe em PDF, sem precisar de conta."
          actions={
            <>
              <Button variant="secondary" onClick={clear}>Limpar</Button>
              <Button onClick={() => window.print()}><FileTextIcon size={16} /> Baixar em PDF</Button>
            </>
          }
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_26rem]">
        <form noValidate className="flex flex-col gap-6 print:hidden" onSubmit={(e) => e.preventDefault()}>
          <Card>
            <CardSectionTitle icon={<IdentificationCardIcon size={18} />} title="Seus dados" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" className="sm:col-span-2">
                {({ id }) => <Input id={id} maxLength={150} autoComplete="name" {...form.register('full_name')} />}
              </Field>
              <Field label="E-mail" error={errors.email?.message}>
                {({ id, invalid }) => <Input id={id} type="email" autoComplete="email" invalid={invalid} {...form.register('email')} />}
              </Field>
              <Field label="Telefone / WhatsApp" error={errors.telefone?.message} hint="Com DDD. Ex.: 22999999999">
                {({ id, invalid }) => <Input id={id} type="tel" inputMode="tel" autoComplete="tel" invalid={invalid} {...form.register('telefone')} />}
              </Field>
              <Field label="Cidade / bairro" className="sm:col-span-2">
                {({ id }) => <Input id={id} maxLength={200} autoComplete="street-address" {...form.register('address')} />}
              </Field>
              <CepLookup className="sm:col-span-2" onFound={(r) => form.setValue('address', cepToAddress(r).slice(0, 200), { shouldValidate: true })} />
              <Field label="Resumo profissional" className="sm:col-span-2" hint="Um parágrafo curto sobre sua experiência e o que você busca.">
                {({ id }) => <Textarea id={id} rows={4} maxLength={2000} {...form.register('bio')} />}
              </Field>
            </div>
          </Card>

          <Card>
            <CardSectionTitle icon={<SparkleIcon size={18} />} title="Habilidades" />
            <Controller control={form.control} name="skills" render={({ field }) => <StringListInput value={field.value} onChange={field.onChange} placeholder="Ex.: Atendimento ao cliente" maxItems={30} maxLength={50} />} />
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <CardSectionTitle icon={<BriefcaseIcon size={18} />} title="Experiência profissional" className="mb-0" />
              <Button size="sm" variant="secondary" disabled={exps.fields.length >= 20} onClick={() => exps.append({ company: '', role: '', start_date: '', end_date: '', description: '' })}>Adicionar</Button>
            </div>
            {exps.fields.length === 0 && <p className="text-sm text-muted">Nenhuma experiência adicionada ainda.</p>}
            <div className="flex flex-col gap-4">
              {exps.fields.map((f, i) => (
                <fieldset key={f.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                  <legend className="sr-only">Experiência {i + 1}</legend>
                  <Field label="Empresa">{({ id }) => <Input id={id} {...form.register(`experiences.${i}.company`)} />}</Field>
                  <Field label="Cargo">{({ id }) => <Input id={id} {...form.register(`experiences.${i}.role`)} />}</Field>
                  <Field label="Início">{({ id }) => <Input id={id} type="month" {...form.register(`experiences.${i}.start_date`)} />}</Field>
                  <Field label="Fim" hint="Deixe vazio se for o emprego atual.">{({ id }) => <Input id={id} type="month" {...form.register(`experiences.${i}.end_date`)} />}</Field>
                  <Field label="Atividades" className="sm:col-span-2">{({ id }) => <Textarea id={id} rows={3} maxLength={2000} {...form.register(`experiences.${i}.description`)} />}</Field>
                  <div className="sm:col-span-2"><Button size="sm" variant="danger-ghost" onClick={() => exps.remove(i)}><TrashIcon size={14} /> Remover experiência</Button></div>
                </fieldset>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-5 flex items-center justify-between">
              <CardSectionTitle icon={<GraduationCapIcon size={18} />} title="Formação" className="mb-0" />
              <Button size="sm" variant="secondary" disabled={edus.fields.length >= 20} onClick={() => edus.append({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' })}>Adicionar</Button>
            </div>
            {edus.fields.length === 0 && <p className="text-sm text-muted">Nenhuma formação adicionada ainda.</p>}
            <div className="flex flex-col gap-4">
              {edus.fields.map((f, i) => (
                <fieldset key={f.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                  <legend className="sr-only">Formação {i + 1}</legend>
                  <Field label="Instituição">{({ id }) => <Input id={id} {...form.register(`educations.${i}.institution`)} />}</Field>
                  <Field label="Grau">{({ id }) => <Input id={id} placeholder="Ex.: Ensino Médio, Técnico" {...form.register(`educations.${i}.degree`)} />}</Field>
                  <Field label="Área de estudo" className="sm:col-span-2">{({ id }) => <Input id={id} {...form.register(`educations.${i}.field_of_study`)} />}</Field>
                  <Field label="Início">{({ id }) => <Input id={id} type="month" {...form.register(`educations.${i}.start_date`)} />}</Field>
                  <Field label="Conclusão">{({ id }) => <Input id={id} type="month" {...form.register(`educations.${i}.end_date`)} />}</Field>
                  <div className="sm:col-span-2"><Button size="sm" variant="danger-ghost" onClick={() => edus.remove(i)}><TrashIcon size={14} /> Remover formação</Button></div>
                </fieldset>
              ))}
            </div>
          </Card>
        </form>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start print:static">
          <p className="text-sm font-bold text-muted print:hidden">Prévia do seu currículo</p>
          <div id="resume-print">
            <ResumePreview
              email={v.email ?? ''}
              fullName={v.full_name ?? ''}
              values={{
                bio: v.bio ?? '',
                telefone: v.telefone ?? '',
                address: v.address ?? '',
                skills: (v.skills ?? []).filter((s): s is string => !!s),
                experiences: (v.experiences ?? []).filter((e): e is Values['experiences'][number] => !!e?.company || !!e?.role),
                educations: (v.educations ?? []).filter((e): e is Values['educations'][number] => !!e?.institution || !!e?.degree),
              }}
            />
          </div>
          {!session && (
            <Card className="print:hidden">
              <h2 className="font-bold">Quer se candidatar às vagas?</h2>
              <p className="mt-1 text-sm text-muted">Crie sua conta grátis para guardar o currículo e enviar para as empresas.</p>
              <Link to="/cadastro" className={buttonClass('primary', 'md', 'mt-4 w-full')}>Cadastre-se</Link>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
