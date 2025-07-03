{{/*
Expand the name of the chart.
*/}}
{{- define "bookedbarber.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "bookedbarber.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "bookedbarber.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "bookedbarber.labels" -}}
helm.sh/chart: {{ include "bookedbarber.chart" . }}
{{ include "bookedbarber.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "bookedbarber.selectorLabels" -}}
app.kubernetes.io/name: {{ include "bookedbarber.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "bookedbarber.backend.labels" -}}
{{ include "bookedbarber.labels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "bookedbarber.backend.selectorLabels" -}}
{{ include "bookedbarber.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "bookedbarber.frontend.labels" -}}
{{ include "bookedbarber.labels" . }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "bookedbarber.frontend.selectorLabels" -}}
{{ include "bookedbarber.selectorLabels" . }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Worker labels
*/}}
{{- define "bookedbarber.worker.labels" -}}
{{ include "bookedbarber.labels" . }}
app.kubernetes.io/component: background-tasks
{{- end }}

{{/*
Worker selector labels
*/}}
{{- define "bookedbarber.worker.selectorLabels" -}}
{{ include "bookedbarber.selectorLabels" . }}
app.kubernetes.io/component: background-tasks
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "bookedbarber.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "bookedbarber.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the image reference
*/}}
{{- define "bookedbarber.image" -}}
{{- $registry := .Values.global.imageRegistry | default .Values.image.registry -}}
{{- $repository := .repository -}}
{{- $tag := .tag | default .Chart.AppVersion -}}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry $repository $tag }}
{{- else }}
{{- printf "%s:%s" $repository $tag }}
{{- end }}
{{- end }}

{{/*
Database URL
*/}}
{{- define "bookedbarber.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgresql://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username .Values.secrets.database.password (include "bookedbarber.fullname" .) .Values.postgresql.auth.database }}
{{- else }}
{{- .Values.secrets.database.url }}
{{- end }}
{{- end }}

{{/*
Redis URL
*/}}
{{- define "bookedbarber.redisUrl" -}}
{{- if .Values.redis.enabled }}
{{- printf "redis://%s-redis-master:6379/0" (include "bookedbarber.fullname" .) }}
{{- else }}
{{- .Values.secrets.redis.url }}
{{- end }}
{{- end }}

{{/*
Security context
*/}}
{{- define "bookedbarber.securityContext" -}}
{{- toYaml .Values.security.securityContext }}
{{- end }}

{{/*
Pod security context
*/}}
{{- define "bookedbarber.podSecurityContext" -}}
runAsNonRoot: true
seccompProfile:
  type: RuntimeDefault
{{- end }}