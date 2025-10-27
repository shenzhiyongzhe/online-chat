"use client";

import { useState } from "react";

interface ClientFormModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isCompleted?: boolean;
}

export function ClientFormModal({
  conversationId,
  isOpen,
  onClose,
  onSuccess,
  isCompleted = false,
}: ClientFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    phone: "",
    ageGender: "",
    loanAmount: "",
    jobPosition: "",
    jobDuration: "",
    monthlyIncome: "",
    payday: "",
    housingDuration: "",
    rent: "",
    livingWith: "",
    maritalStatus: "",
    hasChildren: "",
    creditStatus: "",
    loanPurpose: "",
    hasProperty: "",
    emptyLoan: "",
    sesameCredit: "",
    phoneModel: "",
    description: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证手机号码格式
  const validatePhone = (phone: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // 验证表单数据
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 必填字段验证
    if (!formData.name.trim()) {
      newErrors.name = "请输入姓名";
    }

    if (!formData.city.trim()) {
      newErrors.city = "请输入城市区镇";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "请输入手机号码";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "请输入正确的手机号码";
    }

    if (!formData.loanAmount.trim()) {
      newErrors.loanAmount = "请输入借款金额";
    }

    // 金额格式验证（数字）
    if (formData.loanAmount.trim() && isNaN(Number(formData.loanAmount))) {
      newErrors.loanAmount = "借款金额必须是数字";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/client-forms/${conversationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
        onClose();
      } else {
        alert("提交失败，请重试");
      }
    } catch (error) {
      console.error("提交表单失败:", error);
      alert("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {isCompleted ? "修改申请表" : "填写申请表"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isCompleted
              ? "请修改您的申请表信息"
              : "请详细填写以下信息，以便我们更好地为您服务"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  updateField("name", e.target.value);
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: "" }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                城市区镇 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => {
                  updateField("city", e.target.value);
                  if (errors.city) {
                    setErrors((prev) => ({ ...prev, city: "" }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.city ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.city && (
                <p className="text-xs text-red-500 mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                手机号码 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  updateField("phone", e.target.value);
                  if (errors.phone) {
                    setErrors((prev) => ({ ...prev, phone: "" }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                性别几岁
              </label>
              <input
                type="text"
                value={formData.ageGender}
                onChange={(e) => updateField("ageGender", e.target.value)}
                placeholder="如：男 30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 借款信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                要借多少 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.loanAmount}
                onChange={(e) => {
                  updateField("loanAmount", e.target.value);
                  if (errors.loanAmount) {
                    setErrors((prev) => ({ ...prev, loanAmount: "" }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.loanAmount ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.loanAmount && (
                <p className="text-xs text-red-500 mt-1">{errors.loanAmount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工作岗位
              </label>
              <input
                type="text"
                value={formData.jobPosition}
                onChange={(e) => updateField("jobPosition", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                做了多久
              </label>
              <input
                type="text"
                value={formData.jobDuration}
                onChange={(e) => updateField("jobDuration", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                月入多少
              </label>
              <input
                type="text"
                value={formData.monthlyIncome}
                onChange={(e) => updateField("monthlyIncome", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                发工资日
              </label>
              <input
                type="text"
                value={formData.payday}
                onChange={(e) => updateField("payday", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 居住信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                住房多久
              </label>
              <input
                type="text"
                value={formData.housingDuration}
                onChange={(e) => updateField("housingDuration", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                租金多少
              </label>
              <input
                type="text"
                value={formData.rent}
                onChange={(e) => updateField("rent", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                跟谁同住
              </label>
              <input
                type="text"
                value={formData.livingWith}
                onChange={(e) => updateField("livingWith", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                婚姻状况
              </label>
              <input
                type="text"
                value={formData.maritalStatus}
                onChange={(e) => updateField("maritalStatus", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有无子女
              </label>
              <input
                type="text"
                value={formData.hasChildren}
                onChange={(e) => updateField("hasChildren", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 征信信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                征信情况
              </label>
              <input
                type="text"
                value={formData.creditStatus}
                onChange={(e) => updateField("creditStatus", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                借款用途
              </label>
              <input
                type="text"
                value={formData.loanPurpose}
                onChange={(e) => updateField("loanPurpose", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有无房车
              </label>
              <input
                type="text"
                value={formData.hasProperty}
                onChange={(e) => updateField("hasProperty", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                借空放没
              </label>
              <input
                type="text"
                value={formData.emptyLoan}
                onChange={(e) => updateField("emptyLoan", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                芝麻信用
              </label>
              <input
                type="text"
                value={formData.sesameCredit}
                onChange={(e) => updateField("sesameCredit", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                手机型号
              </label>
              <input
                type="text"
                value={formData.phoneModel}
                onChange={(e) => updateField("phoneModel", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 描述情况 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述情况
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请详细描述您的具体情况..."
            />
          </div>

          {/* 按钮 */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "提交中..."
                : isCompleted
                ? "修改申请"
                : "提交申请"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
