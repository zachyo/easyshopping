import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface PaymentAttemptAttributes {
  id: string;
  mandate_id: string;
  installment_number: number;
  amount: number;
  status: "attempted" | "success" | "failed";
  failure_reason: string | null;
  transaction_reference: string;
  webhook_data: any;
  attempted_at: Date;
}

interface PaymentAttemptCreationAttributes extends Optional<
  PaymentAttemptAttributes,
  "id" | "failure_reason" | "attempted_at"
> {}

class PaymentAttempt
  extends Model<PaymentAttemptAttributes, PaymentAttemptCreationAttributes>
  implements PaymentAttemptAttributes
{
  public id!: string;
  public mandate_id!: string;
  public installment_number!: number;
  public amount!: number;
  public status!: "attempted" | "success" | "failed";
  public failure_reason!: string | null;
  public transaction_reference!: string;
  public webhook_data!: any;
  public attempted_at!: Date;
}

PaymentAttempt.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mandate_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "mandates",
        key: "id",
      },
    },
    installment_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("attempted", "success", "failed"),
      allowNull: false,
    },
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    transaction_reference: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    webhook_data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    attempted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "payment_attempts",
    timestamps: false,
    indexes: [
      {
        fields: ["transaction_reference"],
      },
      {
        fields: ["mandate_id", "installment_number"],
      },
    ],
  },
);

export default PaymentAttempt;
