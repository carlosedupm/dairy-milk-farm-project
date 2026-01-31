package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ceialmilk/api/internal/models"
	"github.com/jackc/pgx/v5"
)

// MockFazendaRepository é um mock do FazendaRepository para testes
type MockFazendaRepository struct {
	CreateFunc         func(ctx context.Context, fazenda *models.Fazenda) error
	GetByIDFunc        func(ctx context.Context, id int64) (*models.Fazenda, error)
	GetAllFunc         func(ctx context.Context) ([]*models.Fazenda, error)
	UpdateFunc         func(ctx context.Context, fazenda *models.Fazenda) error
	DeleteFunc         func(ctx context.Context, id int64) error
	SearchByNomeFunc   func(ctx context.Context, nome string) ([]*models.Fazenda, error)
	CountFunc          func(ctx context.Context) (int64, error)
	ExistsByNomeFunc   func(ctx context.Context, nome string) (bool, error)
}

func (m *MockFazendaRepository) Create(ctx context.Context, fazenda *models.Fazenda) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, fazenda)
	}
	fazenda.ID = 1
	fazenda.CreatedAt = time.Now()
	fazenda.UpdatedAt = time.Now()
	return nil
}

func (m *MockFazendaRepository) GetByID(ctx context.Context, id int64) (*models.Fazenda, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, pgx.ErrNoRows
}

func (m *MockFazendaRepository) GetAll(ctx context.Context) ([]*models.Fazenda, error) {
	if m.GetAllFunc != nil {
		return m.GetAllFunc(ctx)
	}
	return []*models.Fazenda{}, nil
}

func (m *MockFazendaRepository) Update(ctx context.Context, fazenda *models.Fazenda) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, fazenda)
	}
	return nil
}

func (m *MockFazendaRepository) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(ctx, id)
	}
	return nil
}

func (m *MockFazendaRepository) SearchByNome(ctx context.Context, nome string) ([]*models.Fazenda, error) {
	if m.SearchByNomeFunc != nil {
		return m.SearchByNomeFunc(ctx, nome)
	}
	return []*models.Fazenda{}, nil
}

func (m *MockFazendaRepository) Count(ctx context.Context) (int64, error) {
	if m.CountFunc != nil {
		return m.CountFunc(ctx)
	}
	return 0, nil
}

func (m *MockFazendaRepository) ExistsByNome(ctx context.Context, nome string) (bool, error) {
	if m.ExistsByNomeFunc != nil {
		return m.ExistsByNomeFunc(ctx, nome)
	}
	return false, nil
}

// FazendaServiceTestable é uma versão testável do FazendaService
// que aceita uma interface de repository
type FazendaServiceTestable struct {
	repo FazendaRepositoryInterface
}

// FazendaRepositoryInterface define a interface do repository para testes
type FazendaRepositoryInterface interface {
	Create(ctx context.Context, fazenda *models.Fazenda) error
	GetByID(ctx context.Context, id int64) (*models.Fazenda, error)
	GetAll(ctx context.Context) ([]*models.Fazenda, error)
	Update(ctx context.Context, fazenda *models.Fazenda) error
	Delete(ctx context.Context, id int64) error
	SearchByNome(ctx context.Context, nome string) ([]*models.Fazenda, error)
	Count(ctx context.Context) (int64, error)
	ExistsByNome(ctx context.Context, nome string) (bool, error)
}

func NewFazendaServiceTestable(repo FazendaRepositoryInterface) *FazendaServiceTestable {
	return &FazendaServiceTestable{repo: repo}
}

func (s *FazendaServiceTestable) Create(ctx context.Context, fazenda *models.Fazenda) error {
	if fazenda.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	return s.repo.Create(ctx, fazenda)
}

func (s *FazendaServiceTestable) GetByID(ctx context.Context, id int64) (*models.Fazenda, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *FazendaServiceTestable) GetAll(ctx context.Context) ([]*models.Fazenda, error) {
	return s.repo.GetAll(ctx)
}

func (s *FazendaServiceTestable) Update(ctx context.Context, fazenda *models.Fazenda) error {
	if fazenda.Nome == "" {
		return errors.New("nome é obrigatório")
	}
	_, err := s.repo.GetByID(ctx, fazenda.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}
	return s.repo.Update(ctx, fazenda)
}

func (s *FazendaServiceTestable) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrFazendaNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id)
}

// Testes

func TestFazendaService_Create(t *testing.T) {
	tests := []struct {
		name        string
		fazenda     *models.Fazenda
		mockSetup   func(*MockFazendaRepository)
		wantErr     bool
		errContains string
	}{
		{
			name: "sucesso ao criar fazenda",
			fazenda: &models.Fazenda{
				Nome:            "Fazenda Teste",
				QuantidadeVacas: 100,
			},
			mockSetup: func(m *MockFazendaRepository) {
				m.CreateFunc = func(ctx context.Context, f *models.Fazenda) error {
					f.ID = 1
					return nil
				}
			},
			wantErr: false,
		},
		{
			name: "erro ao criar fazenda sem nome",
			fazenda: &models.Fazenda{
				Nome:            "",
				QuantidadeVacas: 100,
			},
			mockSetup:   func(m *MockFazendaRepository) {},
			wantErr:     true,
			errContains: "nome é obrigatório",
		},
		{
			name: "erro do repository ao criar",
			fazenda: &models.Fazenda{
				Nome:            "Fazenda Teste",
				QuantidadeVacas: 100,
			},
			mockSetup: func(m *MockFazendaRepository) {
				m.CreateFunc = func(ctx context.Context, f *models.Fazenda) error {
					return errors.New("erro de banco")
				}
			},
			wantErr:     true,
			errContains: "erro de banco",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &MockFazendaRepository{}
			tt.mockSetup(mock)
			svc := NewFazendaServiceTestable(mock)

			err := svc.Create(context.Background(), tt.fazenda)

			if tt.wantErr {
				if err == nil {
					t.Errorf("esperava erro, mas não recebeu")
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("erro esperado contendo %q, recebeu %q", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("não esperava erro, mas recebeu: %v", err)
				}
			}
		})
	}
}

func TestFazendaService_GetByID(t *testing.T) {
	tests := []struct {
		name      string
		id        int64
		mockSetup func(*MockFazendaRepository)
		wantErr   bool
		wantNil   bool
	}{
		{
			name: "sucesso ao buscar fazenda",
			id:   1,
			mockSetup: func(m *MockFazendaRepository) {
				m.GetByIDFunc = func(ctx context.Context, id int64) (*models.Fazenda, error) {
					return &models.Fazenda{ID: id, Nome: "Fazenda Teste"}, nil
				}
			},
			wantErr: false,
			wantNil: false,
		},
		{
			name: "fazenda não encontrada",
			id:   999,
			mockSetup: func(m *MockFazendaRepository) {
				m.GetByIDFunc = func(ctx context.Context, id int64) (*models.Fazenda, error) {
					return nil, pgx.ErrNoRows
				}
			},
			wantErr: true,
			wantNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &MockFazendaRepository{}
			tt.mockSetup(mock)
			svc := NewFazendaServiceTestable(mock)

			result, err := svc.GetByID(context.Background(), tt.id)

			if tt.wantErr && err == nil {
				t.Errorf("esperava erro, mas não recebeu")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("não esperava erro, mas recebeu: %v", err)
			}
			if tt.wantNil && result != nil {
				t.Errorf("esperava nil, mas recebeu: %v", result)
			}
			if !tt.wantNil && result == nil {
				t.Errorf("não esperava nil")
			}
		})
	}
}

func TestFazendaService_Update(t *testing.T) {
	tests := []struct {
		name        string
		fazenda     *models.Fazenda
		mockSetup   func(*MockFazendaRepository)
		wantErr     bool
		errContains string
	}{
		{
			name: "sucesso ao atualizar fazenda",
			fazenda: &models.Fazenda{
				ID:              1,
				Nome:            "Fazenda Atualizada",
				QuantidadeVacas: 200,
			},
			mockSetup: func(m *MockFazendaRepository) {
				m.GetByIDFunc = func(ctx context.Context, id int64) (*models.Fazenda, error) {
					return &models.Fazenda{ID: id, Nome: "Fazenda Original"}, nil
				}
				m.UpdateFunc = func(ctx context.Context, f *models.Fazenda) error {
					return nil
				}
			},
			wantErr: false,
		},
		{
			name: "erro ao atualizar fazenda sem nome",
			fazenda: &models.Fazenda{
				ID:              1,
				Nome:            "",
				QuantidadeVacas: 200,
			},
			mockSetup:   func(m *MockFazendaRepository) {},
			wantErr:     true,
			errContains: "nome é obrigatório",
		},
		{
			name: "erro ao atualizar fazenda inexistente",
			fazenda: &models.Fazenda{
				ID:              999,
				Nome:            "Fazenda Atualizada",
				QuantidadeVacas: 200,
			},
			mockSetup: func(m *MockFazendaRepository) {
				m.GetByIDFunc = func(ctx context.Context, id int64) (*models.Fazenda, error) {
					return nil, pgx.ErrNoRows
				}
			},
			wantErr:     true,
			errContains: "não encontrada",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &MockFazendaRepository{}
			tt.mockSetup(mock)
			svc := NewFazendaServiceTestable(mock)

			err := svc.Update(context.Background(), tt.fazenda)

			if tt.wantErr {
				if err == nil {
					t.Errorf("esperava erro, mas não recebeu")
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("erro esperado contendo %q, recebeu %q", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("não esperava erro, mas recebeu: %v", err)
				}
			}
		})
	}
}

func TestFazendaService_Delete(t *testing.T) {
	tests := []struct {
		name        string
		id          int64
		mockSetup   func(*MockFazendaRepository)
		wantErr     bool
		errContains string
	}{
		{
			name: "sucesso ao deletar fazenda",
			id:   1,
			mockSetup: func(m *MockFazendaRepository) {
				m.GetByIDFunc = func(ctx context.Context, id int64) (*models.Fazenda, error) {
					return &models.Fazenda{ID: id, Nome: "Fazenda"}, nil
				}
				m.DeleteFunc = func(ctx context.Context, id int64) error {
					return nil
				}
			},
			wantErr: false,
		},
		{
			name: "erro ao deletar fazenda inexistente",
			id:   999,
			mockSetup: func(m *MockFazendaRepository) {
				m.GetByIDFunc = func(ctx context.Context, id int64) (*models.Fazenda, error) {
					return nil, pgx.ErrNoRows
				}
			},
			wantErr:     true,
			errContains: "não encontrada",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &MockFazendaRepository{}
			tt.mockSetup(mock)
			svc := NewFazendaServiceTestable(mock)

			err := svc.Delete(context.Background(), tt.id)

			if tt.wantErr {
				if err == nil {
					t.Errorf("esperava erro, mas não recebeu")
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("erro esperado contendo %q, recebeu %q", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("não esperava erro, mas recebeu: %v", err)
				}
			}
		})
	}
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
