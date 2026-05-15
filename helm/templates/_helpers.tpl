{{/*
Expand the name of the chart.
*/}}
{{- define "team-management.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "team-management.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to all resources.
*/}}
{{- define "team-management.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for the app Deployment.
*/}}
{{- define "team-management.selectorLabels" -}}
app.kubernetes.io/name: {{ include "team-management.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for the Meilisearch StatefulSet.
*/}}
{{- define "team-management.meilisearchSelectorLabels" -}}
app.kubernetes.io/name: {{ include "team-management.name" . }}-meilisearch
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Name of the shared secret (synced from ExternalSecret).
*/}}
{{- define "team-management.secretName" -}}
{{ include "team-management.fullname" . }}-secrets
{{- end }}

{{/*
Name of the ConfigMap.
*/}}
{{- define "team-management.configmapName" -}}
{{ include "team-management.fullname" . }}-config
{{- end }}
