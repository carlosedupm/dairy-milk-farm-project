package repository

import "testing"

func TestParseTimelineFilterTipo(t *testing.T) {
	tests := []struct {
		input   string
		want    TimelineFilterTipo
		wantOK  bool
	}{
		{"todos", TimelineFilterTodos, true},
		{"ciclo", TimelineFilterCiclo, true},
		{"saude", TimelineFilterSaude, true},
		{"alertas", TimelineFilterAlertas, true},
		{"", TimelineFilterTodos, false},
		{"invalid", TimelineFilterTodos, false},
	}

	for _, tt := range tests {
		got, ok := ParseTimelineFilterTipo(tt.input)
		if ok != tt.wantOK {
			t.Fatalf("ParseTimelineFilterTipo(%q) ok = %v, want %v", tt.input, ok, tt.wantOK)
		}
		if tt.wantOK && got != tt.want {
			t.Fatalf("ParseTimelineFilterTipo(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestTimelineFilterClause(t *testing.T) {
	if got := timelineFilterClause(TimelineFilterTodos, 0); got != "" {
		t.Fatalf("todos filter should be empty, got %q", got)
	}
	if got := timelineFilterClause(TimelineFilterSaude, 0); got != ` AND ev.tipo = 'SAUDE'` {
		t.Fatalf("unexpected saude clause: %q", got)
	}
	if got := timelineFilterClause(TimelineFilterAlertas, 0); got != ` AND ev.tipo = 'ALERTA'` {
		t.Fatalf("unexpected alertas clause: %q", got)
	}
	ciclo := timelineFilterClause(TimelineFilterCiclo, 0)
	if ciclo == "" || ciclo == ` AND ev.tipo = 'SAUDE'` {
		t.Fatalf("unexpected ciclo clause: %q", ciclo)
	}
}
